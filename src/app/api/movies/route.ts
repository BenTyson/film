import { prisma } from '@/lib/prisma';
import { tmdb } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';
import type { MovieGridItem } from '@/types/movie';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag') || '';
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

    // Build orderBy clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'title':
        orderBy = { title: sortOrder };
        break;
      case 'release_date':
        orderBy = { release_date: sortOrder };
        break;
      case 'personal_rating':
      case 'date_watched':
        // For user-specific fields, we'll sort in JS after fetching
        // Use created_at as default for now
        orderBy = { created_at: sortOrder };
        break;
      default:
        orderBy = { created_at: sortOrder };
        break;
    }

    const [movies, total, grandTotal] = await Promise.all([
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
      prisma.movie.count({ where: { approval_status: 'approved' } }) // Only count approved movies
    ]);

    // Filter low-confidence matches if requested
    let filteredMovies = movies;
    if (tag === 'low-confidence') {
      filteredMovies = movies.filter(isLowConfidenceMatch);
    }

    // Transform to MovieGridItem format
    let movieGridItems: MovieGridItem[] = filteredMovies.map(movie => {
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

    // Apply JavaScript sorting for user-specific fields
    if (sortBy === 'personal_rating') {
      movieGridItems.sort((a, b) => {
        const aRating = a.personal_rating || 0;
        const bRating = b.personal_rating || 0;
        return sortOrder === 'desc' ? bRating - aRating : aRating - bRating;
      });
    } else if (sortBy === 'date_watched') {
      movieGridItems.sort((a, b) => {
        const aDate = a.date_watched ? new Date(a.date_watched).getTime() : 0;
        const bDate = b.date_watched ? new Date(b.date_watched).getTime() : 0;
        return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
      });
    }

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
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch movies'
    }, { status: 500 });
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

    // Check if movie already exists
    const existingMovie = await prisma.movie.findUnique({
      where: { tmdb_id: parseInt(tmdb_id) }
    });

    if (existingMovie) {
      return NextResponse.json(
        { success: false, error: 'Movie already exists in collection' },
        { status: 409 }
      );
    }

    // Get movie details from TMDB
    const movieDetails = await tmdb.getMovieDetails(parseInt(tmdb_id));
    const credits = await tmdb.getMovieCredits(parseInt(tmdb_id));
    const director = tmdb.findDirector(credits);

    // Create movie record
    const movie = await prisma.movie.create({
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
        tagline: movieDetails.tagline
      }
    });

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
    return NextResponse.json({
      success: false,
      error: 'Failed to add movie to collection'
    }, { status: 500 });
  }
}