/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { prisma } from '@/lib/prisma';
import { tmdb } from '@/lib/tmdb';
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
}

interface ImportResult {
  success: boolean;
  movieTitle: string;
  tmdbMatch?: any;
  error?: string;
  confidenceScore: number;
  severity: 'high' | 'medium' | 'low';
  csvRowNumber: number;
}

// String similarity function (from backfill-csv)
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

// Create match analysis for a movie
function createMatchAnalysis(csvRow: CSVRow, movieDetails: any, director: string | null): {
  confidenceScore: number;
  severity: 'high' | 'medium' | 'low';
  mismatches: string[];
  titleSimilarity: number;
  directorSimilarity: number;
  yearDifference: number;
} {
  const mismatches: string[] = [];
  let confidenceScore = 100;

  // Title comparison
  const titleSimilarity = calculateStringSimilarity(csvRow.Title, movieDetails?.title || '');
  if (titleSimilarity < 80) {
    mismatches.push(`Title: "${csvRow.Title}" vs "${movieDetails?.title || 'Unknown'}"`);
    confidenceScore -= (100 - titleSimilarity) * 0.6;
  }

  // Director comparison
  let directorSimilarity = 100;
  if (csvRow['Dir.'] && director) {
    directorSimilarity = calculateStringSimilarity(csvRow['Dir.'], director);
    if (directorSimilarity < 80) {
      mismatches.push(`Director: "${csvRow['Dir.']}" vs "${director}"`);
      confidenceScore -= (100 - directorSimilarity) * 0.3;
    }
  } else if (csvRow['Dir.'] && !director) {
    mismatches.push(`CSV has director "${csvRow['Dir.']}" but TMDB match has none`);
    confidenceScore -= 20;
    directorSimilarity = 0;
  } else {
    directorSimilarity = movieDetails ? 100 : 0;
  }

  // Year comparison
  let yearDifference = 0;
  if (csvRow.Yr && movieDetails?.release_date) {
    const csvYear = parseInt(csvRow.Yr);
    const movieYear = new Date(movieDetails.release_date).getFullYear();
    yearDifference = Math.abs(csvYear - movieYear);

    if (yearDifference > 1) {
      mismatches.push(`Year: ${csvRow.Yr} vs ${movieYear}`);
      confidenceScore -= Math.min(yearDifference * 5, 30);
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
    const { dryRun = false, limitRows = null, skipRows = 0 } = body;

    console.log('Clean CSV import started:', { dryRun, limitRows, skipRows });

    // Read CSV file from project root
    const csvPath = path.join(process.cwd(), 'movies.csv');

    try {
      await fs.access(csvPath);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'movies.csv not found in project root' },
        { status: 404 }
      );
    }

    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');

    console.log(`Found ${lines.length - 1} rows in CSV`);

    // Parse CSV rows
    const csvRows: CSVRow[] = [];
    const startRow = 1 + skipRows; // Start after header + skip rows
    const maxRows = limitRows ? Math.min(startRow + limitRows, lines.length) : lines.length;

    for (let i = startRow; i < maxRows; i++) {
      const values = lines[i].split(',');
      if (values.length >= headers.length && values[2]?.trim()) { // Must have title
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        csvRows.push(row as CSVRow);
      }
    }

    console.log(`Processing ${csvRows.length} CSV rows`);

    const results: ImportResult[] = [];
    const importStats = {
      total: csvRows.length,
      successful: 0,
      failedTmdb: 0,
      errors: 0
    };

    for (let rowIndex = 0; rowIndex < csvRows.length; rowIndex++) {
      const row = csvRows[rowIndex];
      const movieTitle = row.Title?.trim();
      const csvRowNumber = rowIndex + 1;

      if (!movieTitle) {
        results.push({
          success: false,
          movieTitle: 'Unknown',
          error: 'Missing title',
          confidenceScore: 0,
          severity: 'high',
          csvRowNumber
        });
        importStats.errors++;
        continue;
      }

      try {
        console.log(`Processing movie ${csvRowNumber}: ${movieTitle}`);

        let movieDetails = null;
        let director = null;
        let tmdbId = null;

        // Try to get TMDB data
        try {
          const searchResults = await tmdb.searchMovies(movieTitle, undefined, 1);

          if (searchResults.results.length > 0) {
            const tmdbMovie = searchResults.results[0];
            movieDetails = await tmdb.getMovieDetails(tmdbMovie.id);
            const credits = await tmdb.getMovieCredits(tmdbMovie.id);
            director = tmdb.findDirector(credits);
            tmdbId = tmdbMovie.id;
            console.log(`Found TMDB match: ${movieDetails.title} (${tmdbId})`);
          } else {
            console.log(`No TMDB match found for: ${movieTitle}`);
          }
        } catch (tmdbError) {
          console.log(`TMDB error for ${movieTitle}:`, tmdbError);
        }

        // Create match analysis
        const analysis = createMatchAnalysis(row, movieDetails, director);

        if (dryRun) {
          results.push({
            success: true,
            movieTitle,
            tmdbMatch: movieDetails ? {
              title: movieDetails.title,
              release_date: movieDetails.release_date,
              tmdb_id: tmdbId
            } : null,
            confidenceScore: analysis.confidenceScore,
            severity: analysis.severity,
            csvRowNumber
          });

          if (movieDetails) {
            importStats.successful++;
          } else {
            importStats.failedTmdb++;
          }
          continue;
        }

        // Create movie record (even for failed TMDB lookups)
        const movieData: any = {
          // CSV data (always present)
          csv_row_number: csvRowNumber,
          csv_title: row.Title?.trim() || null,
          csv_director: row['Dir.']?.trim() || null,
          csv_year: row.Yr?.trim() || null,
          csv_notes: row.Notes?.trim() || null,
          // Always set to pending approval
          approval_status: 'pending'
        };

        if (movieDetails && tmdbId) {
          // Full TMDB data available
          Object.assign(movieData, {
            tmdb_id: tmdbId,
            title: movieDetails.title,
            original_title: movieDetails.original_title,
            release_date: movieDetails.release_date ? new Date(movieDetails.release_date) : null,
            overview: movieDetails.overview,
            poster_path: movieDetails.poster_path,
            backdrop_path: movieDetails.backdrop_path,
            vote_average: movieDetails.vote_average,
            vote_count: movieDetails.vote_count,
            popularity: movieDetails.popularity,
            genres: movieDetails.genres || null,
            director: director || null,
            runtime: movieDetails.runtime,
            budget: movieDetails.budget,
            revenue: movieDetails.revenue,
            tagline: movieDetails.tagline
          });
        } else {
          // Failed TMDB lookup - create minimal record with CSV data
          Object.assign(movieData, {
            tmdb_id: Math.floor(Math.random() * 1000000) + 999999999, // Fake unique TMDB ID
            title: row.Title?.trim() || 'Unknown Title',
            director: row['Dir.']?.trim() || null,
            release_date: row.Yr ? new Date(`${row.Yr}-01-01`) : null,
            overview: `Movie imported from CSV: ${row.Notes || 'No description available'}`,
            poster_path: null,
            vote_average: 0,
            vote_count: 0,
            popularity: 0
          });

          // Low confidence for failed lookups
          analysis.confidenceScore = Math.min(analysis.confidenceScore, 30);
          analysis.severity = 'high';
          analysis.mismatches.unshift('No TMDB match found - manual review required');
        }

        // Create movie with transaction
        const movie = await prisma.$transaction(async (tx) => {
          // Create movie
          const createdMovie = await tx.movie.create({
            data: movieData
          });

          // Create match analysis
          await tx.movieMatchAnalysis.create({
            data: {
              movie_id: createdMovie.id,
              confidence_score: analysis.confidenceScore,
              severity: analysis.severity,
              mismatches: analysis.mismatches,
              title_similarity: analysis.titleSimilarity,
              director_similarity: analysis.directorSimilarity,
              year_difference: analysis.yearDifference
            }
          });

          // Create basic user movie record
          const personalData = parsePersonalData(row);
          await tx.userMovie.create({
            data: {
              movie_id: createdMovie.id,
              user_id: 1,
              date_watched: personalData.dateWatched,
              buddy_watched_with: personalData.buddyWatchedWith,
              notes: personalData.notes
            }
          });

          return createdMovie;
        });

        results.push({
          success: true,
          movieTitle,
          tmdbMatch: movieDetails ? {
            title: movie.title,
            release_date: movie.release_date,
            tmdb_id: movie.tmdb_id
          } : null,
          confidenceScore: analysis.confidenceScore,
          severity: analysis.severity,
          csvRowNumber
        });

        if (movieDetails) {
          importStats.successful++;
        } else {
          importStats.failedTmdb++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error importing ${movieTitle}:`, error);
        results.push({
          success: false,
          movieTitle,
          error: 'Import failed',
          confidenceScore: 0,
          severity: 'high',
          csvRowNumber
        });
        importStats.errors++;
      }
    }

    console.log('Import completed:', importStats);

    return NextResponse.json({
      success: true,
      data: {
        results,
        stats: importStats,
        dryRun
      }
    });

  } catch (error) {
    console.error('Error in clean CSV import:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to import CSV'
    }, { status: 500 });
  }
}

// Parse personal data from CSV (reused from existing import)
function parsePersonalData(row: CSVRow) {
  const notes = row.Notes?.trim() || '';
  const completed = row.Completed?.trim() || '';

  let buddyWatchedWith = null;
  if (notes.toLowerCase().includes('with calen')) {
    buddyWatchedWith = 'Calen';
  } else if (notes.toLowerCase().includes('with morgan')) {
    buddyWatchedWith = 'Morgan';
  } else if (notes.toLowerCase().includes('with liam')) {
    buddyWatchedWith = 'Liam';
  } else if (notes.toLowerCase().includes('with elodi')) {
    buddyWatchedWith = 'Elodi';
  }

  let dateWatched = null;
  if (completed) {
    try {
      const dateParts = completed.split('.');
      if (dateParts.length === 3) {
        const [month, day, year] = dateParts;
        const fullYear = year.length === 2 ? `20${year}` : year;
        dateWatched = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
    } catch (error) {
      // Invalid date format, leave as null
    }
  }

  return {
    dateWatched,
    buddyWatchedWith,
    notes: notes || null
  };
}