import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getWatchlistMovies,
  getWatchlistMovie,
  addToWatchlist,
  addToWatchlistFromTMDB,
  updateWatchlistTags,
  removeFromWatchlist,
  isInWatchlist,
} from './watchlistService';
import type { TMDBEnhancedSearchResult } from '@/types/tmdb';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console.error to keep test output clean
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('watchlistService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getWatchlistMovies', () => {
    it('returns watchlist movies on success', async () => {
      const mockMovies = [
        { id: 1, title: 'Movie 1', tmdb_id: 550 },
        { id: 2, title: 'Movie 2', tmdb_id: 551 },
      ];

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockMovies }),
      });

      const result = await getWatchlistMovies();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMovies);
    });

    it('filters by tag when tagId provided', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      await getWatchlistMovies(5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tagId=5')
      );
    });

    it('returns error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Server error' }),
      });

      const result = await getWatchlistMovies();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getWatchlistMovies();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch watchlist');
    });
  });

  describe('getWatchlistMovie', () => {
    it('returns single movie on success', async () => {
      const mockMovie = { id: 1, title: 'Fight Club', tmdb_id: 550 };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockMovie }),
      });

      const result = await getWatchlistMovie(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMovie);
    });

    it('returns error when movie not found', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Movie not found' }),
      });

      const result = await getWatchlistMovie(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Movie not found');
    });
  });

  describe('addToWatchlist', () => {
    it('adds movie successfully', async () => {
      const addedMovie = { id: 1, tmdb_id: 550, title: 'Fight Club' };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: addedMovie }),
      });

      const result = await addToWatchlist({
        tmdb_id: 550,
        title: 'Fight Club',
        tag_ids: [1, 2],
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

    it('returns error when movie already exists', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Already in watchlist' }),
      });

      const result = await addToWatchlist({ tmdb_id: 550, title: 'Fight Club' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already in watchlist');
    });
  });

  describe('addToWatchlistFromTMDB', () => {
    it('transforms TMDB result and adds to watchlist', async () => {
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

      const addedMovie = { id: 1, tmdb_id: 550, title: 'Fight Club' };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: addedMovie }),
      });

      const result = await addToWatchlistFromTMDB(tmdbMovie, [1, 2]);

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.tmdb_id).toBe(550);
      expect(callBody.title).toBe('Fight Club');
      expect(callBody.director).toBe('David Fincher');
      expect(callBody.tag_ids).toEqual([1, 2]);
    });

    it('works without tag IDs', async () => {
      const tmdbMovie: TMDBEnhancedSearchResult = {
        id: 550,
        title: 'Fight Club',
        adult: false,
        original_language: 'en',
        original_title: 'Fight Club',
        popularity: 100,
        video: false,
        vote_count: 1000,
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      await addToWatchlistFromTMDB(tmdbMovie);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.tag_ids).toBeUndefined();
    });
  });

  describe('updateWatchlistTags', () => {
    it('updates tags successfully', async () => {
      const updatedMovie = { id: 1, watchlist_tags: [{ tag_id: 3 }] };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: updatedMovie }),
      });

      const result = await updateWatchlistTags(1, [3, 4]);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ tag_ids: [3, 4] }),
        })
      );
    });
  });

  describe('removeFromWatchlist', () => {
    it('removes movie successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await removeFromWatchlist(1);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('returns error when movie not found', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Not found' }),
      });

      const result = await removeFromWatchlist(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });
  });

  describe('isInWatchlist', () => {
    it('returns true when movie is in watchlist', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: [{ tmdb_id: 550 }, { tmdb_id: 551 }],
        }),
      });

      const result = await isInWatchlist(550);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('returns false when movie is not in watchlist', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: [{ tmdb_id: 551 }, { tmdb_id: 552 }],
        }),
      });

      const result = await isInWatchlist(550);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('returns error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Server error' }),
      });

      const result = await isInWatchlist(550);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
    });
  });
});
