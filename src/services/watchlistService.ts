/**
 * Watchlist Service
 * Centralized API interactions for watchlist management
 */

import { API_ENDPOINTS } from '@/lib/constants';
import { TMDBEnhancedSearchResult } from '@/types/tmdb';

export interface WatchlistTag {
  tag_id: number;
  tags: {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
  };
}

export interface WatchlistMovie {
  id: number;
  user_id: number;
  tmdb_id: number;
  title: string;
  director: string | null;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  runtime: number | null;
  genres: string | null;
  vote_average: number | null;
  imdb_id: string | null;
  created_at: string;
  updated_at: string;
  watchlist_tags: WatchlistTag[];
}

export interface AddToWatchlistInput {
  tmdb_id: number;
  title: string;
  director?: string | null;
  release_date?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  runtime?: number | null;
  genres?: string | null;
  vote_average?: number | null;
  imdb_id?: string | null;
  tag_ids?: number[];
}

export interface WatchlistServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get all watchlist movies
 */
export async function getWatchlistMovies(
  tagId?: number
): Promise<WatchlistServiceResult<WatchlistMovie[]>> {
  try {
    const url = tagId
      ? `${API_ENDPOINTS.WATCHLIST}?tagId=${tagId}`
      : API_ENDPOINTS.WATCHLIST;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to fetch watchlist' };
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return { success: false, error: 'Failed to fetch watchlist' };
  }
}

/**
 * Get a single watchlist movie by ID
 */
export async function getWatchlistMovie(
  movieId: number
): Promise<WatchlistServiceResult<WatchlistMovie>> {
  try {
    const response = await fetch(API_ENDPOINTS.WATCHLIST_BY_ID(movieId));
    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to fetch watchlist movie' };
  } catch (error) {
    console.error('Error fetching watchlist movie:', error);
    return { success: false, error: 'Failed to fetch watchlist movie' };
  }
}

/**
 * Add a movie to watchlist
 */
export async function addToWatchlist(
  input: AddToWatchlistInput
): Promise<WatchlistServiceResult<WatchlistMovie>> {
  try {
    const response = await fetch(API_ENDPOINTS.WATCHLIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to add to watchlist' };
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    return { success: false, error: 'Failed to add to watchlist' };
  }
}

/**
 * Add movie to watchlist from TMDB search result
 */
export async function addToWatchlistFromTMDB(
  movie: TMDBEnhancedSearchResult,
  tagIds?: number[]
): Promise<WatchlistServiceResult<WatchlistMovie>> {
  return addToWatchlist({
    tmdb_id: movie.id,
    title: movie.title,
    director: movie.director || null,
    release_date: movie.release_date || null,
    poster_path: movie.poster_path || null,
    backdrop_path: movie.backdrop_path || null,
    overview: movie.overview || null,
    runtime: movie.runtime || null,
    genres: movie.genres ? JSON.stringify(movie.genres) : null,
    vote_average: movie.vote_average || null,
    imdb_id: movie.imdb_id || null,
    tag_ids: tagIds,
  });
}

/**
 * Update watchlist movie tags
 */
export async function updateWatchlistTags(
  movieId: number,
  tagIds: number[]
): Promise<WatchlistServiceResult<WatchlistMovie>> {
  try {
    const response = await fetch(API_ENDPOINTS.WATCHLIST_BY_ID(movieId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_ids: tagIds }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to update tags' };
  } catch (error) {
    console.error('Error updating watchlist tags:', error);
    return { success: false, error: 'Failed to update tags' };
  }
}

/**
 * Remove movie from watchlist
 */
export async function removeFromWatchlist(
  movieId: number
): Promise<WatchlistServiceResult<void>> {
  try {
    const response = await fetch(API_ENDPOINTS.WATCHLIST_BY_ID(movieId), {
      method: 'DELETE',
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    }

    return { success: false, error: data.error || 'Failed to remove from watchlist' };
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    return { success: false, error: 'Failed to remove from watchlist' };
  }
}

/**
 * Check if a movie is in the watchlist by TMDB ID
 */
export async function isInWatchlist(
  tmdbId: number
): Promise<WatchlistServiceResult<boolean>> {
  const result = await getWatchlistMovies();

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const found = result.data.some((movie) => movie.tmdb_id === tmdbId);
  return { success: true, data: found };
}
