import { prisma, checkDatabaseHealth } from '@/lib/prisma';
import { tmdb } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';
import type { MovieGridItem } from '@/types/movie';

// Request timeout configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

function isLowConfidenceMatch(movie: any): boolean {
  if (!movie.csv_row_number || !movie.csv_title) return false;

  // Simple title similarity check
  const movieTitle = movie.title.toLowerCase().trim();
  const csvTitle = movie.csv_title.toLowerCase().trim();

  // If titles are very different (first word doesn't match)
  const movieFirstWord = movieTitle.split(' ')[0];
  const csvFirstWord = csvTitle.split(' ')[0];

  if (movieFirstWord !== csvFirstWord && !movieTitle.includes(csvFirstWord) && !csvTitle.includes(movieFirstWord)) {
    return true;
  }

  // Director mismatch
  if (movie.csv_director && movie.director) {
    const movieDirector = movie.director.toLowerCase().trim();
    const csvDirector = movie.csv_director.toLowerCase().trim();

    if (!movieDirector.includes(csvDirector) && !csvDirector.includes(movieDirector)) {
      return true;
    }
  }

  // Year mismatch (more than 2 years difference)
  if (movie.csv_year && movie.release_date) {
    const csvYear = parseInt(movie.csv_year);
    const movieYear = new Date(movie.release_date).getFullYear();

    if (Math.abs(csvYear - movieYear) > 2) {
      return true;
    }
  }

  return false;
}

// Database operation wrapper with timeout and retry logic
async function withDatabaseRetry<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Check database health before operation
      const health = await checkDatabaseHealth();
      if (!health.healthy && attempt === 1) {
        console.warn('Database health check failed, proceeding with operation');
      }

      // Wrap operation with timeout
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Database operation timeout')), REQUEST_TIMEOUT)
        )
      ]);
    } catch (error) {
      lastError = error;
      console.error(`Database operation attempt ${attempt} failed:`, error);

      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag') || '';
    const year = searchParams.get('year') || '';
    const sortBy = searchParams.get('sortBy') || 'date_watched';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {
      // Only show approved movies on the main movies page
      approval_status: 'approved'
    };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { director: { contains: search } },
      ];
    }

    if (tag) {
      switch (tag) {
        case 'favorites':
          where.user_movies = {
            some: {
              is_favorite: true
            }
          };
          break;
        case 'oscar-winners':
          where.oscar_data = {
            some: {
              nomination_type: 'won'
            }
          };
          break;
        case 'recent':
          // Movies watched in the last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          where.user_movies = {
            some: {
              date_watched: {
                gte: thirtyDaysAgo
              }
            }
          };
          break;
        case 'low-confidence':
          // Movies with CSV data that likely have matching issues
          where.csv_row_number = { not: null };
          // We'll filter these further with JavaScript after fetching
          break;
        default:
          // Handle regular tag names (like 'Calen')
          where.movie_tags = {
            some: {
              tag: {
                name: { equals: tag }
              }
            }
          };
          break;
      }
    }

    if (year) {
      const yearInt = parseInt(year);
      where.release_date = {
        gte: new Date(`${yearInt}-01-01`),
        lt: new Date(`${yearInt + 1}-01-01`)
      };
    }

    // Build orderBy clause
    let orderBy: any = {};
    let needsAllMovies = false; // Flag to determine if we need to fetch all movies for proper sorting

    switch (sortBy) {
      case 'title':
        orderBy = { title: sortOrder };
        break;
      case 'release_date':
        orderBy = { release_date: sortOrder };
        break;
      case 'personal_rating':
      case 'date_watched':
        // For user-specific fields, we need to fetch all movies first, then sort and paginate
        needsAllMovies = true;
        orderBy = { created_at: 'desc' }; // Default order for fetching all
        break;
      default:
        orderBy = { created_at: sortOrder };
        break;
    }

    let movies;
    let total;
    let grandTotal;

    if (needsAllMovies) {
      // Fetch all movies matching the filter for proper sorting
      const [allMovies, totalCount, grandTotalCount] = await withDatabaseRetry(() =>
        Promise.all([
          prisma.movie.findMany({
            where,
            include: {
              user_movies: true,
              oscar_data: true,
              movie_tags: {
                include: {
                  tag: true
                }
              }
            }
          }),
          prisma.movie.count({ where }),
          prisma.movie.count({ where: { approval_status: 'approved' } })
        ])
      );

      // Sort all movies based on the requested field
      if (sortBy === 'personal_rating') {
        allMovies.sort((a, b) => {
          const aRating = a.user_movies[0]?.personal_rating || 0;
          const bRating = b.user_movies[0]?.personal_rating || 0;
          return sortOrder === 'desc' ? bRating - aRating : aRating - bRating;
        });
      } else if (sortBy === 'date_watched') {
        allMovies.sort((a, b) => {
          const aDate = a.user_movies[0]?.date_watched ? new Date(a.user_movies[0].date_watched).getTime() : 0;
          const bDate = b.user_movies[0]?.date_watched ? new Date(b.user_movies[0].date_watched).getTime() : 0;

          // If both have watch dates, sort by watch date
          if (aDate && bDate) {
            return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
          }

          // If one has watch date and other doesn't, prioritize the one with watch date
          if (aDate && !bDate) return sortOrder === 'desc' ? -1 : 1;
          if (!aDate && bDate) return sortOrder === 'desc' ? 1 : -1;

          // If neither has watch date, sort by release date as fallback
          const aRelease = a.release_date ? new Date(a.release_date).getTime() : 0;
          const bRelease = b.release_date ? new Date(b.release_date).getTime() : 0;
          return sortOrder === 'desc' ? bRelease - aRelease : aRelease - bRelease;
        });
      }

      // Apply pagination after sorting
      movies = allMovies.slice(skip, skip + limit);
      total = totalCount;
      grandTotal = grandTotalCount;
    } else {
      // Use standard pagination for database-sortable fields
      const [fetchedMovies, totalCount, grandTotalCount] = await withDatabaseRetry(() =>
        Promise.all([
          prisma.movie.findMany({
            where,
            include: {
              user_movies: true,
              oscar_data: true,
              movie_tags: {
                include: {
                  tag: true
                }
              }
            },
            orderBy,
            skip,
            take: limit,
          }),
          prisma.movie.count({ where }),
          prisma.movie.count({ where: { approval_status: 'approved' } })
        ])
      );

      movies = fetchedMovies;
      total = totalCount;
      grandTotal = grandTotalCount;
    }

    // Filter low-confidence matches if requested
    let filteredMovies = movies;
    if (tag === 'low-confidence') {
      filteredMovies = movies.filter(isLowConfidenceMatch);
    }

    // Transform to MovieGridItem format
    const movieGridItems: MovieGridItem[] = filteredMovies.map(movie => {
      const userMovie = movie.user_movies[0]; // Assuming one user for now
      const oscarWins = movie.oscar_data.filter(o => o.nomination_type === 'won').length;
      const oscarNominations = movie.oscar_data.length;

      return {
        id: movie.id,
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        release_date: movie.release_date,
        director: movie.director,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        personal_rating: userMovie?.personal_rating || null,
        date_watched: userMovie?.date_watched || null,
        is_favorite: userMovie?.is_favorite || false,
        oscar_badges: {
          nominations: oscarNominations,
          wins: oscarWins,
          categories: movie.oscar_data.map(o => o.category),
        },
        tags: movie.movie_tags.map(mt => ({
          name: mt.tag.name,
          color: mt.tag.color,
          icon: mt.tag.icon,
        })),
      };
    });

    // JavaScript sorting is now handled earlier when needsAllMovies is true
    // No additional sorting needed here

    // Adjust total count for low-confidence filter
    const adjustedTotal = tag === 'low-confidence' ? filteredMovies.length : total;
    const totalPages = Math.ceil(adjustedTotal / limit);

    return NextResponse.json({
      success: true,
      data: {
        movies: movieGridItems,
        pagination: {
          page,
          limit,
          total: adjustedTotal,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        totalMovies: grandTotal
      }
    });

  } catch (error) {
    console.error('Error fetching movies:', error);

    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to fetch movies';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout - the server is taking too long to respond';
        statusCode = 408;
      } else if (error.message.includes('connection')) {
        errorMessage = 'Database connection error - please try again';
        statusCode = 503;
      } else if (error.message.includes('SQLITE_BUSY')) {
        errorMessage = 'Database is busy - please try again in a moment';
        statusCode = 503;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tmdb_id,
      personal_rating,
      date_watched,
      is_favorite,
      buddy_watched_with,
      tags,
      notes
    } = body;

    if (!tmdb_id) {
      return NextResponse.json(
        { success: false, error: 'TMDB ID is required' },
        { status: 400 }
      );
    }

    // Check if movie already exists and is approved
    const existingMovie = await withDatabaseRetry(() =>
      prisma.movie.findUnique({
        where: { tmdb_id: parseInt(tmdb_id) }
      })
    );

    if (existingMovie && existingMovie.approval_status === 'approved') {
      return NextResponse.json(
        { success: false, error: 'Movie already exists in collection' },
        { status: 409 }
      );
    }

    // If movie exists but was removed, update it back to approved instead of creating new
    if (existingMovie && existingMovie.approval_status === 'removed') {
      const updatedMovie = await withDatabaseRetry(() =>
        prisma.movie.update({
          where: { id: existingMovie.id },
          data: {
            approval_status: 'approved',
            approved_at: new Date(),
            approved_by: 'User'
          }
        })
      );

      // Create user movie record if personal data provided
      if (personal_rating || date_watched || is_favorite || buddy_watched_with || notes) {
        await prisma.userMovie.create({
          data: {
            movie_id: updatedMovie.id,
            user_id: 1, // Default user for now
            personal_rating: personal_rating ? parseInt(personal_rating) : null,
            date_watched: date_watched ? new Date(date_watched) : null,
            is_favorite: is_favorite || false,
            buddy_watched_with: buddy_watched_with || null,
            notes: notes || null
          }
        });
      }

      // Handle tags if provided
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          // Find or create tag
          let tag = await prisma.tag.findUnique({
            where: { name: tagName }
          });

          if (!tag) {
            tag = await prisma.tag.create({
              data: {
                name: tagName,
                color: '#6366f1', // Default color
                icon: 'tag'
              }
            });
          }

          // Link movie to tag (check if it doesn't already exist)
          const existingMovieTag = await prisma.movieTag.findUnique({
            where: {
              movie_id_tag_id: {
                movie_id: updatedMovie.id,
                tag_id: tag.id
              }
            }
          });

          if (!existingMovieTag) {
            await prisma.movieTag.create({
              data: {
                movie_id: updatedMovie.id,
                tag_id: tag.id
              }
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          id: updatedMovie.id,
          tmdb_id: updatedMovie.tmdb_id,
          title: updatedMovie.title,
          message: 'Movie re-added to collection successfully'
        }
      });
    }

    // Get movie details from TMDB
    const movieDetails = await tmdb.getMovieDetails(parseInt(tmdb_id));
    const credits = await tmdb.getMovieCredits(parseInt(tmdb_id));
    const director = tmdb.findDirector(credits);

    // Create movie record
    const movie = await withDatabaseRetry(() =>
      prisma.movie.create({
      data: {
        tmdb_id: parseInt(tmdb_id),
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
        approval_status: "approved",
        approved_at: new Date()
      }
    })
  );

    // Create user movie record if personal data provided
    if (personal_rating || date_watched || is_favorite || buddy_watched_with || notes) {
      await prisma.userMovie.create({
        data: {
          movie_id: movie.id,
          user_id: 1, // Default user for now
          personal_rating: personal_rating ? parseInt(personal_rating) : null,
          date_watched: date_watched ? new Date(date_watched) : null,
          is_favorite: is_favorite || false,
          buddy_watched_with: buddy_watched_with || null,
          notes: notes || null
        }
      });
    }

    // Handle tags if provided
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Find or create tag
        let tag = await prisma.tag.findUnique({
          where: { name: tagName }
        });

        if (!tag) {
          tag = await prisma.tag.create({
            data: {
              name: tagName,
              color: '#6366f1', // Default color
              icon: 'tag'
            }
          });
        }

        // Link movie to tag
        await prisma.movieTag.create({
          data: {
            movie_id: movie.id,
            tag_id: tag.id
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: movie.id,
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        message: 'Movie added to collection successfully'
      }
    });

  } catch (error) {
    console.error('Error adding movie:', error);

    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to add movie to collection';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout - the server is taking too long to respond';
        statusCode = 408;
      } else if (error.message.includes('connection')) {
        errorMessage = 'Database connection error - please try again';
        statusCode = 503;
      } else if (error.message.includes('SQLITE_BUSY')) {
        errorMessage = 'Database is busy - please try again in a moment';
        statusCode = 503;
      } else if (error.message.includes('UNIQUE constraint')) {
        errorMessage = 'Movie already exists in collection';
        statusCode = 409;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: statusCode });
  }
}