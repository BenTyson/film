import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getVaults,
  getVault,
  createVault,
  updateVault,
  deleteVault,
  addToVault,
  addToVaultFromTMDB,
  removeFromVault,
  isInVault,
} from './vaultService';
import type { TMDBEnhancedSearchResult } from '@/types/tmdb';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console.error to keep test output clean
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('vaultService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getVaults', () => {
    it('returns vaults on success', async () => {
      const mockVaults = [
        { id: 1, name: 'Vault 1', movie_count: 5 },
        { id: 2, name: 'Vault 2', movie_count: 3 },
      ];

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockVaults }),
      });

      const result = await getVaults();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockVaults);
    });

    it('returns error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Server error' }),
      });

      const result = await getVaults();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getVaults();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch vaults');
    });
  });

  describe('getVault', () => {
    it('returns vault with movies on success', async () => {
      const mockVault = {
        id: 1,
        name: 'Test Vault',
        movies: [{ id: 1, title: 'Movie 1' }],
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockVault }),
      });

      const result = await getVault(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockVault);
    });

    it('returns error when vault not found', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Vault not found' }),
      });

      const result = await getVault(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vault not found');
    });
  });

  describe('createVault', () => {
    it('creates vault successfully', async () => {
      const newVault = { id: 1, name: 'New Vault', description: 'Test' };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: newVault }),
      });

      const result = await createVault({ name: 'New Vault', description: 'Test' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(newVault);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New Vault', description: 'Test' }),
        })
      );
    });

    it('returns error on creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Name required' }),
      });

      const result = await createVault({ name: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Name required');
    });
  });

  describe('updateVault', () => {
    it('updates vault successfully', async () => {
      const updatedVault = { id: 1, name: 'Updated Name' };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: updatedVault }),
      });

      const result = await updateVault(1, { name: 'Updated Name' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedVault);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('deleteVault', () => {
    it('deletes vault successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await deleteVault(1);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('returns error when vault not found', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Vault not found' }),
      });

      const result = await deleteVault(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vault not found');
    });
  });

  describe('addToVault', () => {
    it('adds movie to vault successfully', async () => {
      const addedMovie = { id: 1, vault_id: 1, tmdb_id: 550, title: 'Fight Club' };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: addedMovie }),
      });

      const result = await addToVault(1, {
        tmdb_id: 550,
        title: 'Fight Club',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(addedMovie);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('returns error when movie already in vault', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Movie already in vault' }),
      });

      const result = await addToVault(1, { tmdb_id: 550, title: 'Fight Club' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Movie already in vault');
    });
  });

  describe('addToVaultFromTMDB', () => {
    it('transforms TMDB result and adds to vault', async () => {
      const tmdbMovie: TMDBEnhancedSearchResult = {
        id: 550,
        title: 'Fight Club',
        director: 'David Fincher',
        release_date: '1999-10-15',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        overview: 'A great movie',
        runtime: 139,
        genres: [{ id: 18, name: 'Drama' }],
        vote_average: 8.4,
        imdb_id: 'tt0137523',
        adult: false,
        original_language: 'en',
        original_title: 'Fight Club',
        popularity: 100,
        video: false,
        vote_count: 1000,
      };

      const addedMovie = { id: 1, vault_id: 1, tmdb_id: 550, title: 'Fight Club' };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: addedMovie }),
      });

      const result = await addToVaultFromTMDB(1, tmdbMovie);

      expect(result.success).toBe(true);

      // Verify the call was made with transformed data
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.tmdb_id).toBe(550);
      expect(callBody.title).toBe('Fight Club');
      expect(callBody.director).toBe('David Fincher');
      expect(callBody.genres).toBe(JSON.stringify([{ id: 18, name: 'Drama' }]));
    });
  });

  describe('removeFromVault', () => {
    it('removes movie from vault successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await removeFromVault(1, 5);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('isInVault', () => {
    it('returns true when movie is in vault', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 1,
            movies: [{ tmdb_id: 550 }, { tmdb_id: 551 }],
          },
        }),
      });

      const result = await isInVault(1, 550);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('returns false when movie is not in vault', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 1,
            movies: [{ tmdb_id: 551 }, { tmdb_id: 552 }],
          },
        }),
      });

      const result = await isInVault(1, 550);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('returns error when vault fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Vault not found' }),
      });

      const result = await isInVault(999, 550);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vault not found');
    });
  });
});
