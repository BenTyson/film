import { tmdb } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const year = searchParams.get('year');

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query parameter is required'
      }, { status: 400 });
    }

    // Search for movies using TMDB
    const searchResults = await tmdb.searchMovies(
      query,
      year ? parseInt(year) : undefined
    );

    return NextResponse.json({
      success: true,
      results: searchResults.results.map(movie => ({
        id: movie.id,
        title: movie.title,
        release_date: movie.release_date,
        overview: movie.overview,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        vote_average: movie.vote_average
      }))
    });

  } catch (error) {
    console.error('Error searching movies:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search movies'
    }, { status: 500 });
  }
}