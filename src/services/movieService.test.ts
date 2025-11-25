import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMovieDetails,
  updateMovie,
  addMovie,
  addMovieFromTMDB,
  removeMovie,
  toggleFavorite,
  updateRating,
  updateNotes,
  updateTMDBAssociation,
  searchLocalMovies,
  getYearCounts,
} from './movieService';
import type { TMDBEnhancedSearchResult } from '@/types/tmdb';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console.error
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('movieService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getMovieDetails', () => {
    it('returns movie details on success', async () => {
      const mockMovie = { id: 1, title: 'Fight Club', personal_rating: 9 };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockMovie }),
      });

      const result = await getMovieDetails(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMovie);
    });

    it('returns error when movie not found', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Movie not found' }),
      });

      const result = await getMovieDetails(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Movie not found');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getMovieDetails(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch movie details');
    });
  });

  describe('updateMovie', () => {
    it('updates movie successfully', async () => {
      const updatedMovie = { id: 1, personal_rating: 8 };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: updatedMovie }),
      });

      const result = await updateMovie(1, { personal_rating: 8 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedMovie);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('returns error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Update failed' }),
      });

      const result = await updateMovie(1, { personal_rating: 8 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('addMovie', () => {
    it('adds movie successfully', async () => {
      const newMovie = { id: 1, tmdb_id: 550, title: 'Fight Club' };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: newMovie }),
      });

      const result = await addMovie({
        tmdb_id: 550,
        title: 'Fight Club',
        personal_rating: 9,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(newMovie);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('returns error when movie already exists', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Movie already exists' }),
      });

      const result = await addMovie({ tmdb_id: 550, title: 'Fight Club' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Movie already exists');
    });
  });

  describe('addMovieFromTMDB', () => {
    it('transforms TMDB result and adds movie', async () => {
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

      const result = await addMovieFromTMDB(tmdbMovie, { personal_rating: 9 });

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.tmdb_id).toBe(550);
      expect(callBody.title).toBe('Fight Club');
      expect(callBody.director).toBe('David Fincher');
      expect(callBody.personal_rating).toBe(9);
    });
  });

  describe('removeMovie', () => {
    it('removes movie successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await removeMovie(1);

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

      const result = await removeMovie(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });
  });

  describe('toggleFavorite', () => {
    it('sets favorite to true', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { is_favorite: true } }),
      });

      const result = await toggleFavorite(1, true);

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.is_favorite).toBe(true);
    });

    it('sets favorite to false', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { is_favorite: false } }),
      });

      const result = await toggleFavorite(1, false);

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.is_favorite).toBe(false);
    });
  });

  describe('updateRating', () => {
    it('updates rating', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { personal_rating: 8 } }),
      });

      const result = await updateRating(1, 8);

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.personal_rating).toBe(8);
    });

    it('clears rating when null', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { personal_rating: null } }),
      });

      const result = await updateRating(1, null);

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.personal_rating).toBeNull();
    });
  });

  describe('updateNotes', () => {
    it('updates notes', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { notes: 'Great movie!' } }),
      });

      const result = await updateNotes(1, 'Great movie!');

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.notes).toBe('Great movie!');
    });
  });

  describe('updateTMDBAssociation', () => {
    it('updates TMDB ID', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { tmdb_id: 551 } }),
      });

      const result = await updateTMDBAssociation(1, 551);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('updates TMDB ID with title', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      await updateTMDBAssociation(1, 551, 'New Title');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.tmdb_id).toBe(551);
      expect(callBody.title).toBe('New Title');
    });
  });

  describe('searchLocalMovies', () => {
    it('returns search results', async () => {
      const mockResults = [
        { id: 1, title: 'Fight Club' },
        { id: 2, title: 'Fighter' },
      ];

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockResults }),
      });

      const result = await searchLocalMovies('fight');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=fight')
      );
    });

    it('encodes search query', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      await searchLocalMovies('the matrix');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=the%20matrix')
      );
    });

    it('returns empty array when no results', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: null }),
      });

      const result = await searchLocalMovies('xyz');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getYearCounts', () => {
    it('returns year counts as record', async () => {
      const mockYears = [
        { year: '2023', count: 10 },
        { year: '2022', count: 15 },
      ];

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockYears }),
      });

      const result = await getYearCounts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ '2023': 10, '2022': 15 });
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getYearCounts();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch year counts');
    });
  });
});
