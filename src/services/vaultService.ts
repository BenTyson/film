/**
 * Vault Service
 * Centralized API interactions for vault management
 */

import { API_ENDPOINTS } from '@/lib/constants';
import { TMDBEnhancedSearchResult } from '@/types/tmdb';

export interface VaultMovie {
  id: number;
  vault_id: number;
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
  // Added by vault detail endpoint
  in_collection?: boolean;
  collection_movie_id?: number | null;
}

export interface Vault {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  movie_count?: number;
  preview_posters?: string[];
  movies?: VaultMovie[];
}

export interface CreateVaultInput {
  name: string;
  description?: string;
}

export interface UpdateVaultInput {
  name?: string;
  description?: string | null;
}

export interface AddToVaultInput {
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
}

export interface VaultServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get all vaults
 */
export async function getVaults(): Promise<VaultServiceResult<Vault[]>> {
  try {
    const response = await fetch(API_ENDPOINTS.VAULTS);
    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to fetch vaults' };
  } catch (error) {
    console.error('Error fetching vaults:', error);
    return { success: false, error: 'Failed to fetch vaults' };
  }
}

/**
 * Get a single vault with its movies
 */
export async function getVault(
  vaultId: number
): Promise<VaultServiceResult<Vault>> {
  try {
    const response = await fetch(API_ENDPOINTS.VAULT_BY_ID(vaultId));
    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to fetch vault' };
  } catch (error) {
    console.error('Error fetching vault:', error);
    return { success: false, error: 'Failed to fetch vault' };
  }
}

/**
 * Create a new vault
 */
export async function createVault(
  input: CreateVaultInput
): Promise<VaultServiceResult<Vault>> {
  try {
    const response = await fetch(API_ENDPOINTS.VAULTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to create vault' };
  } catch (error) {
    console.error('Error creating vault:', error);
    return { success: false, error: 'Failed to create vault' };
  }
}

/**
 * Update a vault
 */
export async function updateVault(
  vaultId: number,
  input: UpdateVaultInput
): Promise<VaultServiceResult<Vault>> {
  try {
    const response = await fetch(API_ENDPOINTS.VAULT_BY_ID(vaultId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to update vault' };
  } catch (error) {
    console.error('Error updating vault:', error);
    return { success: false, error: 'Failed to update vault' };
  }
}

/**
 * Delete a vault
 */
export async function deleteVault(
  vaultId: number
): Promise<VaultServiceResult<void>> {
  try {
    const response = await fetch(API_ENDPOINTS.VAULT_BY_ID(vaultId), {
      method: 'DELETE',
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    }

    return { success: false, error: data.error || 'Failed to delete vault' };
  } catch (error) {
    console.error('Error deleting vault:', error);
    return { success: false, error: 'Failed to delete vault' };
  }
}

/**
 * Add a movie to vault
 */
export async function addToVault(
  vaultId: number,
  input: AddToVaultInput
): Promise<VaultServiceResult<VaultMovie>> {
  try {
    const response = await fetch(API_ENDPOINTS.VAULT_MOVIES(vaultId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to add to vault' };
  } catch (error) {
    console.error('Error adding to vault:', error);
    return { success: false, error: 'Failed to add to vault' };
  }
}

/**
 * Add movie to vault from TMDB search result
 */
export async function addToVaultFromTMDB(
  vaultId: number,
  movie: TMDBEnhancedSearchResult
): Promise<VaultServiceResult<VaultMovie>> {
  return addToVault(vaultId, {
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
  });
}

/**
 * Remove a movie from vault
 */
export async function removeFromVault(
  vaultId: number,
  movieId: number
): Promise<VaultServiceResult<void>> {
  try {
    const response = await fetch(API_ENDPOINTS.VAULT_MOVIE(vaultId, movieId), {
      method: 'DELETE',
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    }

    return { success: false, error: data.error || 'Failed to remove from vault' };
  } catch (error) {
    console.error('Error removing from vault:', error);
    return { success: false, error: 'Failed to remove from vault' };
  }
}

/**
 * Check if a movie is in a specific vault
 */
export async function isInVault(
  vaultId: number,
  tmdbId: number
): Promise<VaultServiceResult<boolean>> {
  const result = await getVault(vaultId);

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const found = result.data.movies?.some((movie) => movie.tmdb_id === tmdbId) ?? false;
  return { success: true, data: found };
}
