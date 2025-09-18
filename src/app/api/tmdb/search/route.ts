import { tmdb } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, enhanced = true } = body;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Check if the query looks like a TMDB ID or URL
    const movieId = tmdb.extractTMDBId(query);
    if (movieId) {
      try {
        const movieDetails = await tmdb.getMovieDetails(movieId);
        return NextResponse.json({
          success: true,
          results: [movieDetails],
          total_results: 1,
          total_pages: 1,
          searchMethod: 'direct_id'
        });
      } catch (error) {
        console.error(`Error fetching movie by ID ${movieId}:`, error);
        // Continue with regular search if ID lookup fails
      }
    }

    // Use enhanced search if requested, otherwise use basic search
    const searchResults = enhanced
      ? await tmdb.searchMoviesEnhanced(query)
      : await tmdb.searchMovies(query);

    return NextResponse.json({
      success: true,
      results: searchResults.results || [],
      total_results: searchResults.total_results || 0,
      total_pages: searchResults.total_pages || 0,
      searchMethod: enhanced ? 'enhanced' : 'basic'
    });

  } catch (error) {
    console.error('Error searching TMDB:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search TMDB' },
      { status: 500 }
    );
  }
}