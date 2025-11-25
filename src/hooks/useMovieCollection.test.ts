import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMovieCollection } from './useMovieCollection';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useMovieCollection', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('initialization', () => {
    it('should initialize with empty state when autoFetch is false', () => {
      const { result } = renderHook(() =>
        useMovieCollection({ autoFetch: false })
      );

      expect(result.current.movies).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.pagination).toBeNull();
      expect(result.current.totalMovies).toBe(0);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.hasMore).toBe(false);
    });

    it('should start with loading true when autoFetch is true', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { movies: [], pagination: null },
          }),
      });

      const { result } = renderHook(() =>
        useMovieCollection({ autoFetch: true })
      );

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('fetchMovies', () => {
    it('should fetch movies successfully', async () => {
      const mockMovies = [
        { id: 1, title: 'Movie 1' },
        { id: 2, title: 'Movie 2' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              movies: mockMovies,
              pagination: {
                page: 1,
                limit: 20,
                total: 2,
                totalPages: 1,
                hasNext: false,
                hasPrev: false,
              },
              totalMovies: 2,
            },
          }),
      });

      const { result } = renderHook(() =>
        useMovieCollection({ autoFetch: false })
      );

      await act(async () => {
        await result.current.fetchMovies();
      });

      expect(result.current.movies).toEqual(mockMovies);
      expect(result.current.totalMovies).toBe(2);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() =>
        useMovieCollection({ autoFetch: false })
      );

      await act(async () => {
        await result.current.fetchMovies();
      });

      expect(result.current.movies).toEqual([]);
      expect(result.current.error).toBe('HTTP error! status: 500');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Unauthorized',
          }),
      });

      const { result } = renderHook(() =>
        useMovieCollection({ autoFetch: false })
      );

      await act(async () => {
        await result.current.fetchMovies();
      });

      expect(result.current.error).toBe('Unauthorized');
    });

    it('should pass URL params correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { movies: [], totalMovies: 0 },
          }),
      });

      const { result } = renderHook(() =>
        useMovieCollection({ autoFetch: false })
      );

      const params = new URLSearchParams();
      params.set('search', 'test');
      params.set('year', '2023');
      params.set('page', '2');
      params.set('limit', '20');

      await act(async () => {
        await result.current.fetchMovies(params);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('year=2023'),
        expect.any(Object)
      );
    });
  });

  describe('loadMore (append)', () => {
    it('should append movies without duplicates', async () => {
      const page1Movies = [
        { id: 1, title: 'Movie 1' },
        { id: 2, title: 'Movie 2' },
      ];

      const page2Movies = [
        { id: 2, title: 'Movie 2' }, // duplicate
        { id: 3, title: 'Movie 3' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              movies: page1Movies,
              pagination: {
                page: 1,
                hasNext: true,
                total: 3,
                totalPages: 2,
              },
            },
          }),
      });

      const { result } = renderHook(() =>
        useMovieCollection({ autoFetch: false })
      );

      // Fetch first page
      await act(async () => {
        await result.current.fetchMovies();
      });

      expect(result.current.movies).toHaveLength(2);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              movies: page2Movies,
              pagination: {
                page: 2,
                hasNext: false,
                total: 3,
                totalPages: 2,
              },
            },
          }),
      });

      // Load more
      await act(async () => {
        await result.current.loadMore();
      });

      // Should have 3 unique movies (not 4)
      expect(result.current.movies).toHaveLength(3);
      expect(result.current.movies.map((m) => m.id)).toEqual([1, 2, 3]);
    });

    it('should not load more when hasMore is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              movies: [{ id: 1 }],
              pagination: { page: 1, hasNext: false },
            },
          }),
      });

      const { result } = renderHook(() =>
        useMovieCollection({ autoFetch: false })
      );

      await act(async () => {
        await result.current.fetchMovies();
      });

      mockFetch.mockClear();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not load more while already loading', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      success: true,
                      data: {
                        movies: [{ id: 1 }],
                        pagination: { page: 1, hasNext: true },
                      },
                    }),
                }),
              100
            )
          )
      );

      const { result } = renderHook(() =>
        useMovieCollection({ autoFetch: false })
      );

      // Start fetching
      act(() => {
        result.current.fetchMovies();
      });

      expect(result.current.isLoading).toBe(true);

      // Try to load more while loading
      await act(async () => {
        await result.current.loadMore();
      });

      // Should only have been called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh', () => {
    it('should re-fetch with last params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { movies: [{ id: 1 }], totalMovies: 1 },
          }),
      });

      const { result } = renderHook(() =>
        useMovieCollection({ autoFetch: false })
      );

      const params = new URLSearchParams();
      params.set('search', 'test');
      params.set('limit', '20');

      await act(async () => {
        await result.current.fetchMovies(params);
      });

      mockFetch.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test'),
        expect.any(Object)
      );
    });
  });

  describe('reset', () => {
    it('should reset to initial state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              movies: [{ id: 1 }],
              pagination: { page: 1, hasNext: false },
              totalMovies: 1,
            },
          }),
      });

      const { result } = renderHook(() =>
        useMovieCollection({ autoFetch: false })
      );

      await act(async () => {
        await result.current.fetchMovies();
      });

      expect(result.current.movies).toHaveLength(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.movies).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.pagination).toBeNull();
      expect(result.current.totalMovies).toBe(0);
      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('custom endpoint', () => {
    it('should use custom endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { movies: [] },
          }),
      });

      const { result } = renderHook(() =>
        useMovieCollection({
          autoFetch: false,
          endpoint: '/api/watchlist',
        })
      );

      await act(async () => {
        await result.current.fetchMovies();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/watchlist'),
        expect.any(Object)
      );
    });
  });

  describe('pagination info', () => {
    it('should update pagination from response', async () => {
      const pagination = {
        page: 2,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { movies: [], pagination },
          }),
      });

      const { result } = renderHook(() =>
        useMovieCollection({ autoFetch: false })
      );

      await act(async () => {
        await result.current.fetchMovies();
      });

      expect(result.current.pagination).toEqual(pagination);
      expect(result.current.currentPage).toBe(2);
      expect(result.current.hasMore).toBe(true);
    });
  });
});
