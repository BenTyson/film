/**
 * Movie Service
 * Centralized API interactions for movie management
 */

import { API_ENDPOINTS } from '@/lib/constants';
import { MovieGridItem } from '@/lib/database';
import { TMDBEnhancedSearchResult } from '@/types/tmdb';

export interface MovieDetails extends MovieGridItem {
  overview?: string;
  runtime?: number;
  imdb_id?: string;
  imdb_rating?: number;
  original_language?: string;
  production_companies?: Array<{ id: number; name: string }>;
  user_movies?: Array<{
    id: number;
    personal_rating: number | null;
    date_watched: string | null;
    notes: string | null;
    is_favorite: boolean;
    watch_location: string | null;
    buddy_watched_with: string[] | null;
  }>;
  movie_tags?: Array<{
    tag: { id: number; name: string; color: string | null; icon: string | null };
  }>;
}

export interface UpdateMovieInput {
  personal_rating?: number | null;
  date_watched?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
  watch_location?: string | null;
  buddy_watched_with?: string[] | null;
  tags?: string[];
}

export interface CreateMovieInput {
  tmdb_id: number;
  title: string;
  director?: string | null;
  release_date?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }> | null;
  imdb_id?: string | null;
  // User-specific fields
  personal_rating?: number | null;
  date_watched?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
  watch_location?: string | null;
  buddy_watched_with?: string[] | null;
  tags?: string[];
}

export interface MovieServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get movie details by ID
 */
export async function getMovieDetails(
  movieId: number
): Promise<MovieServiceResult<MovieDetails>> {
  try {
    const response = await fetch(API_ENDPOINTS.MOVIE_BY_ID(movieId));
    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to fetch movie' };
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return { success: false, error: 'Failed to fetch movie details' };
  }
}

/**
 * Update movie user data (rating, notes, etc.)
 */
export async function updateMovie(
  movieId: number,
  input: UpdateMovieInput
): Promise<MovieServiceResult<MovieDetails>> {
  try {
    const response = await fetch(API_ENDPOINTS.MOVIE_BY_ID(movieId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to update movie' };
  } catch (error) {
    console.error('Error updating movie:', error);
    return { success: false, error: 'Failed to update movie' };
  }
}

/**
 * Add a new movie to collection
 */
export async function addMovie(
  input: CreateMovieInput
): Promise<MovieServiceResult<MovieDetails>> {
  try {
    const response = await fetch(API_ENDPOINTS.MOVIES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to add movie' };
  } catch (error) {
    console.error('Error adding movie:', error);
    return { success: false, error: 'Failed to add movie' };
  }
}

/**
 * Add movie from TMDB search result
 */
export async function addMovieFromTMDB(
  movie: TMDBEnhancedSearchResult,
  userInput: Omit<CreateMovieInput, 'tmdb_id' | 'title' | 'director' | 'release_date' | 'poster_path' | 'backdrop_path' | 'overview' | 'runtime' | 'genres' | 'imdb_id'> = {}
): Promise<MovieServiceResult<MovieDetails>> {
  return addMovie({
    tmdb_id: movie.id,
    title: movie.title,
    director: movie.director || null,
    release_date: movie.release_date || null,
    poster_path: movie.poster_path || null,
    backdrop_path: movie.backdrop_path || null,
    overview: movie.overview || null,
    runtime: movie.runtime || null,
    genres: movie.genres || null,
    imdb_id: movie.imdb_id || null,
    ...userInput,
  });
}

/**
 * Remove movie from collection
 */
export async function removeMovie(
  movieId: number
): Promise<MovieServiceResult<void>> {
  try {
    const response = await fetch(API_ENDPOINTS.MOVIE_REMOVE(movieId), {
      method: 'DELETE',
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    }

    return { success: false, error: data.error || 'Failed to remove movie' };
  } catch (error) {
    console.error('Error removing movie:', error);
    return { success: false, error: 'Failed to remove movie' };
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(
  movieId: number,
  isFavorite: boolean
): Promise<MovieServiceResult<MovieDetails>> {
  return updateMovie(movieId, { is_favorite: isFavorite });
}

/**
 * Update movie rating
 */
export async function updateRating(
  movieId: number,
  rating: number | null
): Promise<MovieServiceResult<MovieDetails>> {
  return updateMovie(movieId, { personal_rating: rating });
}

/**
 * Update movie notes
 */
export async function updateNotes(
  movieId: number,
  notes: string | null
): Promise<MovieServiceResult<MovieDetails>> {
  return updateMovie(movieId, { notes });
}

/**
 * Update TMDB association for a movie
 */
export async function updateTMDBAssociation(
  movieId: number,
  tmdbId: number,
  title?: string
): Promise<MovieServiceResult<MovieDetails>> {
  try {
    const response = await fetch(API_ENDPOINTS.MOVIE_UPDATE_TMDB(movieId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: tmdbId, ...(title && { title }) }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to update TMDB association' };
  } catch (error) {
    console.error('Error updating TMDB association:', error);
    return { success: false, error: 'Failed to update TMDB association' };
  }
}

/**
 * Search local movies
 */
export async function searchLocalMovies(
  query: string
): Promise<MovieServiceResult<MovieGridItem[]>> {
  try {
    const response = await fetch(
      `${API_ENDPOINTS.SEARCH_MOVIES}?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data || [] };
    }

    return { success: false, error: data.error || 'Search failed' };
  } catch (error) {
    console.error('Error searching movies:', error);
    return { success: false, error: 'Failed to search movies' };
  }
}

/**
 * Get available years with movie counts
 */
export async function getYearCounts(): Promise<
  MovieServiceResult<Record<string, number>>
> {
  try {
    const response = await fetch(API_ENDPOINTS.MOVIES_YEARS);
    const data = await response.json();

    if (data.success) {
      const counts: Record<string, number> = {};
      data.data.forEach((item: { year: string; count: number }) => {
        counts[item.year] = item.count;
      });
      return { success: true, data: counts };
    }

    return { success: false, error: data.error || 'Failed to fetch years' };
  } catch (error) {
    console.error('Error fetching year counts:', error);
    return { success: false, error: 'Failed to fetch year counts' };
  }
}
