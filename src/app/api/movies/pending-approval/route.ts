/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const severity = searchParams.get('severity') as 'high' | 'medium' | 'low' | null;
    const confidenceThreshold = parseInt(searchParams.get('confidence') || '0');

    const skip = (page - 1) * limit;

    // Build where clause - focus on movies that need approval
    // For clean import, all movies should have explicit 'pending' status
    const where: any = {
      approval_status: 'pending'
    };

    // Add filters for match analysis if specified
    const analysisFilters: any = {};
    if (severity) {
      analysisFilters.severity = severity;
    }
    if (confidenceThreshold > 0) {
      analysisFilters.confidence_score = { lte: confidenceThreshold };
    }

    // If we have analysis filters, include them
    if (Object.keys(analysisFilters).length > 0) {
      where.movie_match_analysis = analysisFilters;
    }

    // Debug: Check what movies we have
    const debugCounts = await Promise.all([
      prisma.movies.count(), // total movies
      prisma.movies.count({ where: { NOT: { csv_row_number: null } } }), // with CSV
      prisma.movies.count({ where: { approval_status: 'pending' } }), // pending
      prisma.movies.count({ where: { approval_status: 'approved' } }) // approved
    ]);

    console.log('Debug counts:', {
      total: debugCounts[0],
      withCsv: debugCounts[1],
      pending: debugCounts[2],
      approved: debugCounts[3]
    });

    const [movies, total] = await Promise.all([
      prisma.movies.findMany({
        where,
        include: {
          movie_match_analysis: true,
          user_movies: true,
          oscar_data: true,
          movie_tags: {
            include: {
              tags: true
            }
          }
        },
        orderBy: [
          // Prioritize movies with CSV data first, then by confidence score
          { csv_row_number: 'asc' },
          { movie_match_analysis: { confidence_score: 'asc' } },
          { created_at: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.movies.count({ where })
    ]);

    // Transform to approval format with all necessary data
    const approvalData = movies.map(movie => {
      const analysis = movie.movie_match_analysis;
      const userMovie = movie.user_movies[0];
      const oscarWins = movie.oscar_data.filter(o => o.is_winner).length;
      const oscarNominations = movie.oscar_data.length;

      return {
        movieId: movie.id,
        movieTitle: movie.title,
        movieDirector: movie.director,
        movieYear: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
        posterPath: movie.poster_path,
        csvRowNumber: movie.csv_row_number,
        csvTitle: movie.csv_title,
        csvDirector: movie.csv_director,
        csvYear: movie.csv_year,
        csvNotes: movie.csv_notes,
        // Match analysis data
        confidenceScore: analysis?.confidence_score || 100,
        severity: analysis?.severity || 'low',
        mismatches: analysis?.mismatches || [],
        titleSimilarity: analysis?.title_similarity || 100,
        directorSimilarity: analysis?.director_similarity || 100,
        yearDifference: analysis?.year_difference || 0,
        // Additional movie data for context
        overview: movie.overview,
        releaseDate: movie.release_date,
        imdbRating: movie.vote_average,
        genres: movie.genres,
        // User data
        personalRating: userMovie?.personal_rating,
        dateWatched: userMovie?.date_watched,
        isFavorite: userMovie?.is_favorite || false,
        // Oscar data
        oscarBadges: {
          nominations: oscarNominations,
          wins: oscarWins,
          categories: movie.oscar_data.map(o => o.category)
        },
        // Tags
        tags: movie.movie_tags.map(mt => ({
          name: mt.tags.name,
          color: mt.tags.color,
          icon: mt.tags.icon
        }))
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        movies: approvalData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
}

// Apply match for a pending movie (this replaces the backfill apply functionality)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { movieId } = body;

    if (!movieId) {
      return NextResponse.json(
        { success: false, error: 'Movie ID is required' },
        { status: 400 }
      );
    }

    // Get the movie to ensure it exists and is pending
    const movie = await prisma.movies.findUnique({
      where: { id: movieId },
      select: {
        id: true,
        approval_status: true,
        title: true,
        csv_row_number: true
      }
    });

    if (!movie) {
      return NextResponse.json(
        { success: false, error: 'Movie not found' },
        { status: 404 }
      );
    }

    if (movie.approval_status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Movie is not in pending status' },
        { status: 400 }
      );
    }

    // For movies that already have CSV data matched, this is just marking as "applied"
    // The CSV data and match analysis should already be in the database
    if (!movie.csv_row_number) {
      return NextResponse.json(
        { success: false, error: 'Movie does not have CSV data to apply' },
        { status: 400 }
      );
    }

    // Update the movie to indicate the match has been "applied"
    // We can use a custom field or just keep it pending until Ben approves
    const updatedMovie = await prisma.movies.update({
      where: { id: movieId },
      data: {
        updated_at: new Date()
        // Keep approval_status as 'pending' - Ben still needs to approve
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        movie: updatedMovie,
        message: `Match applied for "${movie.title}". Ready for Ben's approval.`
      }
    });

  } catch (error) {
    console.error('Error applying match:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply match' },
      { status: 500 }
    );
  }
}