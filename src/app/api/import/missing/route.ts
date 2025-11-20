/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { tmdb } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';

interface CSVRow {
  '#': string;
  'Yr': string;
  'Title': string;
  'Dir.': string;
  'Notes': string;
  'Completed': string;
}

interface FailedMovie extends CSVRow {
  failureReason: string;
  tmdbSearchResults?: any[];
  suggestedActions?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvData } = body;

    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json(
        { success: false, error: 'CSV data is required' },
        { status: 400 }
      );
    }

    // Get all current movie titles from database
    const existingMovies = await prisma.movies.findMany({
      select: {
        title: true,
        tmdb_id: true
      }
    });

    const existingTitles = new Set(existingMovies.map(m => m.title.toLowerCase().trim()));

    // Find missing movies and analyze failure reasons
    const failedMovies: FailedMovie[] = [];

    for (const row of csvData as CSVRow[]) {
      const movieTitle = row.Title?.trim();

      if (!movieTitle) {
        failedMovies.push({
          ...row,
          failureReason: 'Missing title in CSV',
          suggestedActions: ['Add movie title to CSV']
        });
        continue;
      }

      // Check if this movie exists in our database
      if (!existingTitles.has(movieTitle.toLowerCase().trim())) {
        console.log(`Analyzing failure for: ${movieTitle}`);

        try {
          // Attempt TMDB search to determine failure reason
          const searchResults = await tmdb.searchMoviesEnhanced(movieTitle);

          let failureReason: string;
          let suggestedActions: string[] = [];
          let tmdbResults: any[] = [];

          if (searchResults.results.length === 0) {
            failureReason = 'No TMDB matches found';
            suggestedActions = [
              'Try alternative movie title spelling',
              'Check if title includes year or additional text',
              'Search manually on TMDB for correct title'
            ];
          } else if (searchResults.results.length === 1) {
            const match = searchResults.results[0];
            failureReason = 'TMDB match found but import failed';
            tmdbResults = [match];
            suggestedActions = [
              'Retry import for this movie',
              'Check if TMDB API was down during import'
            ];
          } else {
            // Multiple results - need to check match quality
            const exactMatch = searchResults.results.find(r =>
              r.title.toLowerCase() === movieTitle.toLowerCase()
            );

            if (exactMatch) {
              failureReason = 'Exact TMDB match found but import failed';
              tmdbResults = [exactMatch];
              suggestedActions = ['Retry import for this movie'];
            } else {
              failureReason = 'Multiple ambiguous TMDB matches';
              tmdbResults = searchResults.results.slice(0, 3);
              suggestedActions = [
                'Review TMDB matches and select correct one',
                'Refine movie title to be more specific'
              ];
            }
          }

          failedMovies.push({
            ...row,
            failureReason,
            tmdbSearchResults: tmdbResults,
            suggestedActions
          });

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`TMDB search error for ${movieTitle}:`, error);
          failedMovies.push({
            ...row,
            failureReason: 'TMDB API error during search',
            suggestedActions: ['Retry when TMDB API is available']
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalInCsv: csvData.length,
        totalInDatabase: existingMovies.length,
        missingCount: failedMovies.length,
        failedMovies: failedMovies
      }
    });

  } catch (error) {
    console.error('Error finding missing movies:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to find missing movies'
    }, { status: 500 });
  }
}