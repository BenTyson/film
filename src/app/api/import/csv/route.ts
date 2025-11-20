/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { prisma } from '@/lib/prisma';
import { tmdb } from '@/lib/tmdb';
import { getCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

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
  alreadyExists?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { csvData, dryRun = false } = body;

    console.log('Import request received:', {
      dataLength: csvData?.length,
      dryRun,
      firstRow: csvData?.[0]
    });

    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json(
        { success: false, error: 'CSV data is required' },
        { status: 400 }
      );
    }

    const results: ImportResult[] = [];
    const importStats = {
      total: csvData.length,
      successful: 0,
      skipped: 0,
      errors: 0,
      alreadyExists: 0
    };

    for (let rowIndex = 0; rowIndex < csvData.length; rowIndex++) {
      const row = csvData[rowIndex] as CSVRow;
      const movieTitle = row.Title?.trim();

      if (!movieTitle) {
        results.push({
          success: false,
          movieTitle: 'Unknown',
          error: 'Missing title'
        });
        importStats.errors++;
        continue;
      }

      try {
        console.log(`Processing movie: ${movieTitle}`);

        // Check if movie already exists
        const existingMovies = await prisma.movies.findMany({
          where: {
            title: {
              contains: movieTitle
            }
          }
        });

        if (existingMovies.length > 0) {
          console.log(`Movie already exists: ${movieTitle}`);
          results.push({
            success: false,
            movieTitle,
            alreadyExists: true,
            error: 'Movie already exists in collection'
          });
          importStats.alreadyExists++;
          continue;
        }

        // Search TMDB for the movie
        console.log(`Searching TMDB for: ${movieTitle}`);
        const searchResults = await tmdb.searchMovies(movieTitle, undefined, 1);

        if (searchResults.results.length === 0) {
          results.push({
            success: false,
            movieTitle,
            error: 'No TMDB match found'
          });
          importStats.errors++;
          continue;
        }

        // Take the first (most relevant) result
        const tmdbMovie = searchResults.results[0];

        if (dryRun) {
          results.push({
            success: true,
            movieTitle,
            tmdbMatch: {
              title: tmdbMovie.title,
              release_date: tmdbMovie.release_date,
              tmdb_id: tmdbMovie.id
            }
          });
          importStats.successful++;
          continue;
        }

        // Get full movie details from TMDB
        const movieDetails = await tmdb.getMovieDetails(tmdbMovie.id);
        const credits = await tmdb.getMovieCredits(tmdbMovie.id);
        const director = tmdb.findDirector(credits);

        // Create movie record with CSV tracking data
        const movie = await prisma.movies.create({
          data: {
            tmdb_id: tmdbMovie.id,
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
            tagline: movieDetails.tagline,
            // CSV tracking data
            csv_row_number: rowIndex + 1, // 1-based row numbering
            csv_title: row.Title?.trim() || null,
            csv_director: row['Dir.']?.trim() || null,
            csv_year: row.Yr?.trim() || null,
            csv_notes: row.Notes?.trim() || null,
            updated_at: new Date()
          }
        });

        // Parse personal data from CSV
        const personalData = parsePersonalData(row);

        // Create user movie record
        await prisma.user_movies.create({
          data: {
            movie_id: movie.id,
            user_id: user.id,
            personal_rating: null, // Not in CSV
            date_watched: personalData.dateWatched,
            is_favorite: false, // Not in CSV
            ...(personalData.buddyWatchedWith && { buddy_watched_with: [personalData.buddyWatchedWith] }),
            notes: personalData.notes,
            updated_at: new Date()
          }
        });

        // Handle tags if any buddy info found
        if (personalData.tags.length > 0) {
          for (const tagName of personalData.tags) {
            // Find or create tag for this user
            let tag = await prisma.tags.findFirst({
              where: {
                name: tagName,
                user_id: user.id
              }
            });

            if (!tag) {
              tag = await prisma.tags.create({
                data: {
                  name: tagName,
                  color: tagName === 'Calen' ? '#3b82f6' : '#6366f1',
                  icon: 'user',
                  user_id: user.id
                }
              });
            }

            await prisma.movie_tags.create({
              data: {
                movie_id: movie.id,
                tag_id: tag.id
              }
            });
          }
        }

        results.push({
          success: true,
          movieTitle,
          tmdbMatch: {
            title: movie.title,
            release_date: movie.release_date,
            tmdb_id: movie.tmdb_id
          }
        });
        importStats.successful++;

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error importing ${movieTitle}:`, error);
        results.push({
          success: false,
          movieTitle,
          error: 'Import failed'
        });
        importStats.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        stats: importStats,
        dryRun
      }
    });

  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to import CSV'
    }, { status: 500 });
  }
}

function parsePersonalData(row: CSVRow) {
  const notes = row.Notes?.trim() || '';
  const completed = row.Completed?.trim() || '';

  // Extract buddy information from notes
  let buddyWatchedWith = null;
  const tags: string[] = [];

  if (notes.toLowerCase().includes('with calen')) {
    buddyWatchedWith = 'Calen';
    tags.push('Calen');
  } else if (notes.toLowerCase().includes('with morgan')) {
    buddyWatchedWith = 'Morgan';
    tags.push('Morgan');
  } else if (notes.toLowerCase().includes('with liam')) {
    buddyWatchedWith = 'Liam';
    tags.push('Liam');
  } else if (notes.toLowerCase().includes('with elodi')) {
    buddyWatchedWith = 'Elodi';
    tags.push('Elodi');
  }

  // Parse completion date
  let dateWatched = null;
  if (completed) {
    try {
      // Try parsing various date formats
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
    notes: notes || null,
    tags
  };
}