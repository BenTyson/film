import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching pending movies...');

    // Simple query for pending movies
    const movies = await prisma.movie.findMany({
      where: {
        approval_status: 'pending'
      },
      include: {
        match_analysis: true,
        user_movies: true
      },
      orderBy: {
        csv_row_number: 'asc'
      },
      take: 50
    });

    console.log(`Found ${movies.length} pending movies`);

    // Transform to approval format
    const approvalData = movies.map(movie => {
      const analysis = movie.match_analysis;
      const userMovie = movie.user_movies[0];

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
        // Additional movie data
        overview: movie.overview,
        releaseDate: movie.release_date,
        imdbRating: movie.vote_average,
        genres: movie.genres,
        // User data
        personalRating: userMovie?.personal_rating,
        dateWatched: userMovie?.date_watched,
        isFavorite: userMovie?.is_favorite || false,
        // Simple structure for now
        oscarBadges: {
          nominations: 0,
          wins: 0,
          categories: []
        },
        tags: []
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        movies: approvalData,
        pagination: {
          page: 1,
          limit: 50,
          total: movies.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
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