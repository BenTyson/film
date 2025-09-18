import { tmdb } from '@/lib/tmdb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test with a popular movie
    const searchResult = await tmdb.searchMovies('The Matrix', 1999);

    if (searchResult.results.length > 0) {
      const movie = searchResult.results[0];
      return NextResponse.json({
        success: true,
        message: 'TMDB API is working!',
        data: {
          title: movie.title,
          release_date: movie.release_date,
          overview: movie.overview,
          poster_url: tmdb.getPosterURL(movie.poster_path),
          backdrop_url: tmdb.getBackdropURL(movie.backdrop_path),
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'No movies found'
      });
    }
  } catch (error) {
    console.error('TMDB API Test Error:', error);
    return NextResponse.json({
      success: false,
      message: 'TMDB API test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}