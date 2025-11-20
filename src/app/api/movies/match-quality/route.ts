/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

interface MatchQuality {
  movieId: number;
  title: string;
  csvTitle: string | null;
  csvDirector: string | null;
  csvYear: string | null;
  director: string | null;
  releaseYear: number | null;
  confidenceScore: number;
  mismatches: string[];
  severity: 'high' | 'medium' | 'low';
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

function assessMatchQuality(movie: any): MatchQuality {
  const mismatches: string[] = [];
  let confidenceScore = 100;

  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;

  // Title comparison
  let titleSimilarity = 100;
  if (movie.csv_title && movie.title) {
    titleSimilarity = calculateStringSimilarity(movie.csv_title, movie.title);

    if (titleSimilarity < 80) {
      mismatches.push(`Title mismatch: "${movie.csv_title}" vs "${movie.title}"`);
      confidenceScore -= (100 - titleSimilarity) * 0.6; // Title is 60% weight
    }
  }

  // Director comparison
  let directorSimilarity = 100;
  if (movie.csv_director && movie.director) {
    directorSimilarity = calculateStringSimilarity(movie.csv_director, movie.director);

    if (directorSimilarity < 80) {
      mismatches.push(`Director mismatch: "${movie.csv_director}" vs "${movie.director}"`);
      confidenceScore -= (100 - directorSimilarity) * 0.3; // Director is 30% weight
    }
  } else if (movie.csv_director && !movie.director) {
    mismatches.push(`CSV has director "${movie.csv_director}" but TMDB match has none`);
    confidenceScore -= 20;
  }

  // Year comparison
  if (movie.csv_year && releaseYear) {
    const csvYear = parseInt(movie.csv_year);
    const yearDiff = Math.abs(csvYear - releaseYear);

    if (yearDiff > 1) {
      mismatches.push(`Year mismatch: ${movie.csv_year} vs ${releaseYear}`);
      confidenceScore -= Math.min(yearDiff * 5, 30); // Max 30 point deduction for year
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
    movieId: movie.id,
    title: movie.title,
    csvTitle: movie.csv_title,
    csvDirector: movie.csv_director,
    csvYear: movie.csv_year,
    director: movie.director,
    releaseYear,
    confidenceScore: Math.max(0, Math.round(confidenceScore)),
    mismatches,
    severity
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const threshold = parseInt(searchParams.get('threshold') || '80');
    const severity = searchParams.get('severity') as 'high' | 'medium' | 'low' | null;

    // Get movies with CSV data
    const movies = await prisma.movies.findMany({
      where: {
        csv_row_number: { not: null }
      },
      select: {
        id: true,
        title: true,
        director: true,
        release_date: true,
        csv_title: true,
        csv_director: true,
        csv_year: true,
        csv_row_number: true
      }
    });

    // Assess match quality for each movie
    const assessments = movies.map(assessMatchQuality);

    // Filter based on criteria
    let filteredAssessments = assessments.filter(assessment =>
      assessment.confidenceScore <= threshold
    );

    if (severity) {
      filteredAssessments = filteredAssessments.filter(assessment =>
        assessment.severity === severity
      );
    }

    // Sort by confidence score (lowest first)
    filteredAssessments.sort((a, b) => a.confidenceScore - b.confidenceScore);

    const summary = {
      total: assessments.length,
      lowConfidence: filteredAssessments.length,
      high: assessments.filter(a => a.severity === 'high').length,
      medium: assessments.filter(a => a.severity === 'medium').length,
      low: assessments.filter(a => a.severity === 'low').length
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        assessments: filteredAssessments
      }
    });

  } catch (error) {
    console.error('Error assessing match quality:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assess match quality' },
      { status: 500 }
    );
  }
}