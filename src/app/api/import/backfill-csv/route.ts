import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface CSVRow {
  '#': string;
  'Yr': string;
  'Title': string;
  'Dir.': string;
  'Notes': string;
  'Completed': string;
  rowNumber: number;
}

interface MatchCandidate {
  movie: {
    id: number;
    title: string;
    director: string | null;
    release_date: Date | null;
    user_movies: unknown[];
  };
  csvRow: CSVRow;
  matchScore: number;
  matchReasons: string[];
  analysis: {
    confidenceScore: number;
    severity: 'high' | 'medium' | 'low';
    mismatches: string[];
    titleSimilarity: number;
    directorSimilarity: number;
    yearDifference: number;
  };
}

function calculateMatchScore(movie: { title: string; director: string | null; release_date: Date | null }, csvRow: CSVRow): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const movieTitle = movie.title.toLowerCase().trim();
  const csvTitle = csvRow.Title.toLowerCase().trim();

  // Exact title match
  if (movieTitle === csvTitle) {
    score += 100;
    reasons.push('Exact title match');
  }
  // Partial title match
  else if (movieTitle.includes(csvTitle) || csvTitle.includes(movieTitle)) {
    score += 80;
    reasons.push('Partial title match');
  }
  // Title similarity (simple word overlap)
  else {
    const movieWords = new Set(movieTitle.split(/\s+/));
    const csvWords = new Set(csvTitle.split(/\s+/));
    const commonWords = new Set([...movieWords].filter(x => csvWords.has(x)));
    const similarity = commonWords.size / Math.max(movieWords.size, csvWords.size);

    if (similarity > 0.5) {
      score += Math.floor(similarity * 60);
      reasons.push(`Title similarity: ${Math.round(similarity * 100)}%`);
    }
  }

  // Director match
  if (movie.director && csvRow['Dir.']) {
    const movieDirector = movie.director.toLowerCase().trim();
    const csvDirector = csvRow['Dir.'].toLowerCase().trim();

    if (movieDirector === csvDirector) {
      score += 50;
      reasons.push('Exact director match');
    } else if (movieDirector.includes(csvDirector) || csvDirector.includes(movieDirector)) {
      score += 30;
      reasons.push('Partial director match');
    }
  }

  // Year match
  if (movie.release_date && csvRow.Yr) {
    const movieYear = new Date(movie.release_date).getFullYear();
    const csvYear = parseInt(csvRow.Yr);

    if (movieYear === csvYear) {
      score += 30;
      reasons.push('Year match');
    } else if (Math.abs(movieYear - csvYear) <= 1) {
      score += 15;
      reasons.push('Year close match');
    }
  }

  return { score, reasons };
}

function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;

  // Calculate Levenshtein distance
  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);

  return Math.round((1 - distance / maxLength) * 100);
}

function createMatchAnalysis(movie: { title: string; director: string | null; release_date: Date | null }, csvRow: CSVRow): {
  confidenceScore: number;
  severity: 'high' | 'medium' | 'low';
  mismatches: string[];
  titleSimilarity: number;
  directorSimilarity: number;
  yearDifference: number;
} {
  const mismatches: string[] = [];
  let confidenceScore = 100;

  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;

  // Title comparison
  const titleSimilarity = calculateStringSimilarity(csvRow.Title, movie.title);
  if (titleSimilarity < 80) {
    mismatches.push(`Title mismatch: "${csvRow.Title}" vs "${movie.title}"`);
    confidenceScore -= (100 - titleSimilarity) * 0.6; // Title is 60% weight
  }

  // Director comparison
  let directorSimilarity = 100;
  if (csvRow['Dir.'] && movie.director) {
    directorSimilarity = calculateStringSimilarity(csvRow['Dir.'], movie.director);

    if (directorSimilarity < 80) {
      mismatches.push(`Director mismatch: "${csvRow['Dir.']}" vs "${movie.director}"`);
      confidenceScore -= (100 - directorSimilarity) * 0.3; // Director is 30% weight
    }
  } else if (csvRow['Dir.'] && !movie.director) {
    mismatches.push(`CSV has director "${csvRow['Dir.']}" but TMDB match has none`);
    confidenceScore -= 20;
    directorSimilarity = 0;
  } else {
    directorSimilarity = 0;
  }

  // Year comparison
  let yearDifference = 0;
  if (csvRow.Yr && releaseYear) {
    const csvYear = parseInt(csvRow.Yr);
    yearDifference = Math.abs(csvYear - releaseYear);

    if (yearDifference > 1) {
      mismatches.push(`Year mismatch: ${csvRow.Yr} vs ${releaseYear}`);
      confidenceScore -= Math.min(yearDifference * 5, 30); // Max 30 point deduction for year
    }
  }

  // Determine severity
  let severity: 'high' | 'medium' | 'low' = 'low';
  if (confidenceScore < 50) {
    severity = 'high';
  } else if (confidenceScore < 80) {
    severity = 'medium';
  }

  return {
    confidenceScore: Math.max(0, Math.round(confidenceScore)),
    severity,
    mismatches,
    titleSimilarity,
    directorSimilarity,
    yearDifference
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dryRun = true, autoApproveThreshold = 150 } = body;

    // Read CSV file
    const csvPath = path.join(process.cwd(), 'movies.csv');

    try {
      await fs.access(csvPath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'movies.csv not found in project root' },
        { status: 404 }
      );
    }

    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');

    // Parse CSV rows
    const csvRows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= headers.length && values[2]?.trim()) { // Must have title
        const row: Record<string, string | number> = { rowNumber: i + 1 }; // 1-based row numbering
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        csvRows.push(row as unknown as CSVRow);
      }
    }

    // Get all existing movies that don't have CSV data yet
    const existingMovies = await prisma.movie.findMany({
      where: {
        csv_row_number: null
      },
      include: {
        user_movies: true
      }
    });

    console.log(`Found ${existingMovies.length} movies without CSV data`);
    console.log(`Found ${csvRows.length} CSV rows`);

    // Find matches
    const matches: MatchCandidate[] = [];
    const usedCsvRows = new Set<number>();
    const usedMovies = new Set<number>();

    // First pass: find high-confidence matches
    for (const movie of existingMovies) {
      if (usedMovies.has(movie.id)) continue;

      let bestMatch: MatchCandidate | null = null;

      for (const csvRow of csvRows) {
        if (usedCsvRows.has(csvRow.rowNumber)) continue;

        const { score, reasons } = calculateMatchScore(movie, csvRow);
        const analysis = createMatchAnalysis(movie, csvRow);

        if (score > 70 && (!bestMatch || score > bestMatch.matchScore)) {
          bestMatch = {
            movie,
            csvRow,
            matchScore: score,
            matchReasons: reasons,
            analysis
          };
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
        usedMovies.add(movie.id);
        usedCsvRows.add(bestMatch.csvRow.rowNumber);
      }
    }

    // Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Apply matches if not dry run
    const results = {
      totalMoviesWithoutCsv: existingMovies.length,
      totalCsvRows: csvRows.length,
      potentialMatches: matches.length,
      autoApplied: 0,
      manualReview: 0,
      matches: matches.map(match => ({
        movieId: match.movie.id,
        movieTitle: match.movie.title,
        movieDirector: match.movie.director,
        movieYear: match.movie.release_date ? new Date(match.movie.release_date).getFullYear() : null,
        csvRowNumber: match.csvRow.rowNumber,
        csvTitle: match.csvRow.Title,
        csvDirector: match.csvRow['Dir.'],
        csvYear: match.csvRow.Yr,
        csvNotes: match.csvRow.Notes,
        matchScore: match.matchScore,
        matchReasons: match.matchReasons,
        autoApproved: match.matchScore >= autoApproveThreshold,
        confidenceScore: match.analysis.confidenceScore,
        severity: match.analysis.severity,
        mismatches: match.analysis.mismatches,
        titleSimilarity: match.analysis.titleSimilarity,
        directorSimilarity: match.analysis.directorSimilarity,
        yearDifference: match.analysis.yearDifference
      }))
    };

    if (!dryRun) {
      // Apply high-confidence matches automatically
      for (const match of matches) {
        if (match.matchScore >= autoApproveThreshold) {
          // Use transaction to ensure data consistency
          await prisma.$transaction(async (tx) => {
            // Update movie with CSV data and set to pending approval
            await tx.movie.update({
              where: { id: match.movie.id },
              data: {
                csv_row_number: match.csvRow.rowNumber,
                csv_title: match.csvRow.Title || null,
                csv_director: match.csvRow['Dir.'] || null,
                csv_year: match.csvRow.Yr || null,
                csv_notes: match.csvRow.Notes || null,
                approval_status: 'pending'
              }
            });

            // Create or update match analysis
            await tx.movieMatchAnalysis.upsert({
              where: { movie_id: match.movie.id },
              create: {
                movie_id: match.movie.id,
                confidence_score: match.analysis.confidenceScore,
                severity: match.analysis.severity,
                mismatches: match.analysis.mismatches,
                title_similarity: match.analysis.titleSimilarity,
                director_similarity: match.analysis.directorSimilarity,
                year_difference: match.analysis.yearDifference
              },
              update: {
                confidence_score: match.analysis.confidenceScore,
                severity: match.analysis.severity,
                mismatches: match.analysis.mismatches,
                title_similarity: match.analysis.titleSimilarity,
                director_similarity: match.analysis.directorSimilarity,
                year_difference: match.analysis.yearDifference,
                updated_at: new Date()
              }
            });
          });

          results.autoApplied++;
        } else {
          results.manualReview++;
        }
      }
    } else {
      results.autoApplied = matches.filter(m => m.matchScore >= autoApproveThreshold).length;
      results.manualReview = matches.filter(m => m.matchScore < autoApproveThreshold).length;
    }

    return NextResponse.json({
      success: true,
      data: results,
      dryRun
    });

  } catch (error) {
    console.error('Error in CSV backfill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process CSV backfill' },
      { status: 500 }
    );
  }
}

// Apply a specific match manually
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { movieId, csvRowNumber, csvTitle, csvDirector, csvYear, csvNotes } = body;

    if (!movieId || !csvRowNumber) {
      return NextResponse.json(
        { success: false, error: 'Movie ID and CSV row number are required' },
        { status: 400 }
      );
    }

    // Get the movie first to create analysis
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: {
        id: true,
        title: true,
        director: true,
        release_date: true
      }
    });

    if (!movie) {
      return NextResponse.json(
        { success: false, error: 'Movie not found' },
        { status: 404 }
      );
    }

    // Create fake CSV row for analysis
    const csvRow: CSVRow = {
      '#': '',
      'Yr': csvYear || '',
      'Title': csvTitle || '',
      'Dir.': csvDirector || '',
      'Notes': csvNotes || '',
      'Completed': '',
      rowNumber: csvRowNumber
    };

    const analysis = createMatchAnalysis(movie, csvRow);

    // Use transaction to update movie and save analysis
    const updatedMovie = await prisma.$transaction(async (tx) => {
      // Update movie with CSV data and set to pending approval
      const updated = await tx.movie.update({
        where: { id: movieId },
        data: {
          csv_row_number: csvRowNumber,
          csv_title: csvTitle || null,
          csv_director: csvDirector || null,
          csv_year: csvYear || null,
          csv_notes: csvNotes || null,
          approval_status: 'pending'
        }
      });

      // Create or update match analysis
      await tx.movieMatchAnalysis.upsert({
        where: { movie_id: movieId },
        create: {
          movie_id: movieId,
          confidence_score: analysis.confidenceScore,
          severity: analysis.severity,
          mismatches: analysis.mismatches,
          title_similarity: analysis.titleSimilarity,
          director_similarity: analysis.directorSimilarity,
          year_difference: analysis.yearDifference
        },
        update: {
          confidence_score: analysis.confidenceScore,
          severity: analysis.severity,
          mismatches: analysis.mismatches,
          title_similarity: analysis.titleSimilarity,
          director_similarity: analysis.directorSimilarity,
          year_difference: analysis.yearDifference,
          updated_at: new Date()
        }
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: {
        movie: updatedMovie,
        analysis
      }
    });

  } catch (error) {
    console.error('Error applying CSV match:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply CSV match' },
      { status: 500 }
    );
  }
}