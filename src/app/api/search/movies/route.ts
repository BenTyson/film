/* eslint-disable @typescript-eslint/no-unused-vars */
import { tmdb } from '@/lib/tmdb';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      }, { status: 400 });
    }

    // Search movies on TMDB
    const searchResults = await tmdb.searchMovies(query.trim(), undefined, page);

    // Get list of movies in CURRENT USER'S collection (not global)
    const existingUserMovies = await prisma.user_movies.findMany({
      select: {
        movies: {
          select: { tmdb_id: true }
        }
      },
      where: {
        user_id: user.id,
        movies: {
          tmdb_id: {
            in: searchResults.results.map(movie => movie.id)
          }
        }
      }
    });

    const existingIds = new Set(existingUserMovies.map(um => um.movies.tmdb_id));

    // Enhance search results with additional info
    const enhancedResults = await Promise.all(
      searchResults.results.map(async (movie) => {
        // Get director info for display
        let director = null;
        try {
          const credits = await tmdb.getMovieCredits(movie.id);
          director = tmdb.findDirector(credits);
        } catch (error) {
          // Continue without director info if error
        }

        return {
          tmdb_id: movie.id,
          title: movie.title,
          original_title: movie.original_title,
          release_date: movie.release_date,
          overview: movie.overview,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          vote_average: movie.vote_average,
          vote_count: movie.vote_count,
          popularity: movie.popularity,
          genre_ids: movie.genre_ids,
          director: director,
          poster_url: tmdb.getPosterURL(movie.poster_path),
          backdrop_url: tmdb.getBackdropURL(movie.backdrop_path),
          already_in_collection: existingIds.has(movie.id),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        results: enhancedResults,
        page: searchResults.page,
        total_pages: searchResults.total_pages,
        total_results: searchResults.total_results,
      }
    });

  } catch (error) {
    console.error('Error searching movies:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search movies'
    }, { status: 500 });
  }
}