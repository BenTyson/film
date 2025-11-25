import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTMDBSearch } from './useTMDBSearch';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useTMDBSearch', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('basic state', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useTMDBSearch());

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should update query state', () => {
      const { result } = renderHook(() => useTMDBSearch());

      act(() => {
        result.current.setQuery('test movie');
      });

      expect(result.current.query).toBe('test movie');
    });

    it('should clear state when clear() is called', () => {
      const { result } = renderHook(() => useTMDBSearch());

      // Set some state
      act(() => {
        result.current.setQuery('test');
      });

      // Clear
      act(() => {
        result.current.clear();
      });

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('search behavior with real timers', () => {
    it('should search and update results on successful search', async () => {
      const mockResults = [
        { id: 1, title: 'Test Movie', poster_path: '/test.jpg' },
        { id: 2, title: 'Another Movie', poster_path: '/test2.jpg' },
      ];

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, results: mockResults }),
      });

      const { result } = renderHook(() => useTMDBSearch({ debounceMs: 10 }));

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(() => {
        expect(result.current.results).toEqual(mockResults);
      }, { timeout: 1000 });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set error on failed search', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'API error' }),
      });

      const { result } = renderHook(() => useTMDBSearch({ debounceMs: 10 }));

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('API error');
      }, { timeout: 1000 });

      expect(result.current.results).toEqual([]);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useTMDBSearch({ debounceMs: 10 }));

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to search movies');
      }, { timeout: 1000 });

      expect(result.current.results).toEqual([]);
    });

    it('should not search for empty query', async () => {
      const { result } = renderHook(() => useTMDBSearch({ debounceMs: 10 }));

      act(() => {
        result.current.setQuery('');
      });

      // Wait a bit to ensure no fetch happens
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.results).toEqual([]);
    });

    it('should include year in search when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, results: [] }),
      });

      const { result } = renderHook(() => useTMDBSearch({ year: 2023, debounceMs: 10 }));

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      }, { timeout: 1000 });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tmdb/search',
        expect.objectContaining({
          body: JSON.stringify({ query: 'test', enhanced: true, year: 2023 }),
        })
      );
    });

    it('should respect enhanced option', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, results: [] }),
      });

      const { result } = renderHook(() => useTMDBSearch({ enhanced: false, debounceMs: 10 }));

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      }, { timeout: 1000 });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tmdb/search',
        expect.objectContaining({
          body: JSON.stringify({ query: 'test', enhanced: false }),
        })
      );
    });
  });

  describe('debounce behavior with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should not search before debounce delay', () => {
      const { result } = renderHook(() => useTMDBSearch({ debounceMs: 300 }));

      act(() => {
        result.current.setQuery('test');
      });

      // Before debounce
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should search after debounce delay', () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, results: [] }),
      });

      const { result } = renderHook(() => useTMDBSearch({ debounceMs: 300 }));

      act(() => {
        result.current.setQuery('test');
      });

      // After debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tmdb/search',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ query: 'test', enhanced: true }),
        })
      );
    });

    it('should respect custom debounce delay', () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: true, results: [] }),
      });

      const { result } = renderHook(() => useTMDBSearch({ debounceMs: 500 }));

      act(() => {
        result.current.setQuery('test');
      });

      // At 300ms - should not have called yet
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(mockFetch).not.toHaveBeenCalled();

      // At 500ms - should call
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
