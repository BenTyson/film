import { NextRequest, NextResponse } from 'next/server';
import { tmdb } from '@/lib/tmdb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movieId = parseInt(params.id);

    if (!movieId || isNaN(movieId)) {
      return NextResponse.json({
        success: false,
        error: 'Valid movie ID is required'
      }, { status: 400 });
    }

    const movieData = await tmdb.getMovieDetails(movieId);

    return NextResponse.json({
      success: true,
      data: {
        id: movieData.id,
        title: movieData.title,
        poster_path: movieData.poster_path,
        backdrop_path: movieData.backdrop_path,
        release_date: movieData.release_date,
        overview: movieData.overview,
        vote_average: movieData.vote_average,
        vote_count: movieData.vote_count,
        runtime: movieData.runtime,
        genres: movieData.genres,
        budget: movieData.budget,
        revenue: movieData.revenue,
        tagline: movieData.tagline,
        imdb_id: movieData.imdb_id
      }
    });

  } catch (error) {
    console.error('Error fetching TMDB movie data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch movie data from TMDB'
    }, { status: 500 });
  }
}