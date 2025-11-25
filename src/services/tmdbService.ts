/**
 * TMDB Service
 * Centralized API interactions for TMDB data
 */

import { API_ENDPOINTS } from '@/lib/constants';
import { TMDBEnhancedSearchResult } from '@/types/tmdb';

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviderData {
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  link?: string;
}

export interface TrailerData {
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface TMDBServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Search TMDB for movies
 */
export async function searchTMDB(
  query: string,
  options: { year?: number; enhanced?: boolean } = {}
): Promise<TMDBServiceResult<TMDBEnhancedSearchResult[]>> {
  const { year, enhanced = true } = options;

  if (!query.trim()) {
    return { success: true, data: [] };
  }

  try {
    const response = await fetch(API_ENDPOINTS.TMDB_SEARCH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        enhanced,
        ...(year && { year }),
      }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.results || [] };
    }

    return { success: false, error: data.error || 'Search failed' };
  } catch (error) {
    console.error('Error searching TMDB:', error);
    return { success: false, error: 'Failed to search movies' };
  }
}

/**
 * Get movie details from TMDB by ID
 */
export async function getTMDBMovie(
  tmdbId: number
): Promise<TMDBServiceResult<TMDBEnhancedSearchResult>> {
  try {
    const response = await fetch(API_ENDPOINTS.TMDB_MOVIE(tmdbId));
    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to fetch movie' };
  } catch (error) {
    console.error('Error fetching TMDB movie:', error);
    return { success: false, error: 'Failed to fetch movie details' };
  }
}

/**
 * Get watch providers for a movie
 */
export async function getWatchProviders(
  tmdbId: number
): Promise<TMDBServiceResult<WatchProviderData>> {
  try {
    const response = await fetch(API_ENDPOINTS.TMDB_WATCH_PROVIDERS(tmdbId));
    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to fetch providers' };
  } catch (error) {
    console.error('Error fetching watch providers:', error);
    return { success: false, error: 'Failed to fetch watch providers' };
  }
}

/**
 * Get trailer for a movie
 */
export async function getTrailer(
  tmdbId: number
): Promise<TMDBServiceResult<TrailerData | null>> {
  try {
    const response = await fetch(API_ENDPOINTS.TMDB_TRAILER(tmdbId));
    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to fetch trailer' };
  } catch (error) {
    console.error('Error fetching trailer:', error);
    return { success: false, error: 'Failed to fetch trailer' };
  }
}

/**
 * Build YouTube embed URL from trailer key
 */
export function buildYouTubeEmbedUrl(trailerKey: string): string {
  return `https://www.youtube.com/embed/${trailerKey}`;
}

/**
 * Build YouTube watch URL from trailer key
 */
export function buildYouTubeWatchUrl(trailerKey: string): string {
  return `https://www.youtube.com/watch?v=${trailerKey}`;
}
