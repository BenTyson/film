/**
 * useMovieCollection Hook
 * Handles fetching paginated movie collections with filtering, sorting, and infinite scroll support
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { MovieGridItem } from '@/lib/database';
import { API_ENDPOINTS } from '@/lib/constants';

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UseMovieCollectionOptions {
  /**
   * Initial page to fetch (default: 1)
   */
  initialPage?: number;
  /**
   * Number of items per page (default: 20)
   */
  limit?: number;
  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;
  /**
   * Whether to fetch automatically on mount (default: true)
   */
  autoFetch?: boolean;
  /**
   * API endpoint to use (default: /api/movies)
   */
  endpoint?: string;
}

export interface UseMovieCollectionResult {
  /**
   * Array of movie items
   */
  movies: MovieGridItem[];
  /**
   * Whether initial load is in progress
   */
  isLoading: boolean;
  /**
   * Whether loading more (appending) is in progress
   */
  isLoadingMore: boolean;
  /**
   * Error message if fetch failed
   */
  error: string | null;
  /**
   * Pagination information
   */
  pagination: PaginationInfo | null;
  /**
   * Total movie count
   */
  totalMovies: number;
  /**
   * Fetch movies with optional params
   */
  fetchMovies: (params?: URLSearchParams, append?: boolean) => Promise<void>;
  /**
   * Load more movies (for infinite scroll)
   */
  loadMore: () => Promise<void>;
  /**
   * Refresh the collection (re-fetch current page)
   */
  refresh: () => Promise<void>;
  /**
   * Whether there are more pages to load
   */
  hasMore: boolean;
  /**
   * Current page number
   */
  currentPage: number;
  /**
   * Reset collection to initial state
   */
  reset: () => void;
}

/**
 * Hook for fetching and managing movie collections
 */
export function useMovieCollection(
  options: UseMovieCollectionOptions = {}
): UseMovieCollectionResult {
  const {
    initialPage = 1,
    limit = 20,
    timeout = 30000,
    autoFetch = true,
    endpoint = API_ENDPOINTS.MOVIES,
  } = options;

  const [movies, setMovies] = useState<MovieGridItem[]>([]);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [totalMovies, setTotalMovies] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Track the last params used for refresh
  const lastParamsRef = useRef<URLSearchParams | null>(null);
  // Abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Cancel any pending request
   */
  const cancelPendingRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Fetch movies with the given params
   */
  const fetchMovies = useCallback(
    async (params?: URLSearchParams, append = false): Promise<void> => {
      // Cancel any pending request
      cancelPendingRequest();

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeout);

      // Build params
      const fetchParams = params || new URLSearchParams();
      if (!fetchParams.has('limit')) {
        fetchParams.set('limit', limit.toString());
      }

      // Store params for refresh
      lastParamsRef.current = fetchParams;

      // Set loading state
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const response = await fetch(`${endpoint}?${fetchParams.toString()}`, {
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          const newMovies = data.data.movies || data.data;
          const paginationData = data.data.pagination;

          if (append) {
            // Append new movies, avoiding duplicates
            setMovies((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const uniqueNewMovies = Array.isArray(newMovies)
                ? newMovies.filter((m: MovieGridItem) => !existingIds.has(m.id))
                : [];
              return [...prev, ...uniqueNewMovies];
            });
          } else {
            // Replace movies
            setMovies(Array.isArray(newMovies) ? newMovies : []);
          }

          if (paginationData) {
            setPagination(paginationData);
            setCurrentPage(paginationData.page);
          }

          if (data.data.totalMovies !== undefined) {
            setTotalMovies(data.data.totalMovies);
          } else if (paginationData?.total !== undefined) {
            setTotalMovies(paginationData.total);
          }
        } else {
          throw new Error(data.error || 'Failed to fetch movies');
        }
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            // Request was cancelled, don't update state
            return;
          }
          setError(err.message);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [cancelPendingRequest, endpoint, limit, timeout]
  );

  /**
   * Load more movies (next page)
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || isLoading || !pagination?.hasNext) {
      return;
    }

    const nextPage = currentPage + 1;
    const params = lastParamsRef.current
      ? new URLSearchParams(lastParamsRef.current)
      : new URLSearchParams();

    params.set('page', nextPage.toString());

    await fetchMovies(params, true);
  }, [currentPage, fetchMovies, isLoading, isLoadingMore, pagination?.hasNext]);

  /**
   * Refresh current page
   */
  const refresh = useCallback(async () => {
    if (lastParamsRef.current) {
      await fetchMovies(lastParamsRef.current, false);
    } else {
      await fetchMovies(undefined, false);
    }
  }, [fetchMovies]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    cancelPendingRequest();
    setMovies([]);
    setIsLoading(false);
    setIsLoadingMore(false);
    setError(null);
    setPagination(null);
    setTotalMovies(0);
    setCurrentPage(initialPage);
    lastParamsRef.current = null;
  }, [cancelPendingRequest, initialPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPendingRequest();
    };
  }, [cancelPendingRequest]);

  const hasMore = pagination?.hasNext ?? false;

  return {
    movies,
    isLoading,
    isLoadingMore,
    error,
    pagination,
    totalMovies,
    fetchMovies,
    loadMore,
    refresh,
    hasMore,
    currentPage,
    reset,
  };
}

/**
 * Hook for infinite scroll behavior
 * Attaches scroll listener and calls loadMore when near bottom
 */
export function useInfiniteScroll(
  loadMore: () => void,
  options: {
    threshold?: number;
    enabled?: boolean;
  } = {}
) {
  const { threshold = 1000, enabled = true } = options;
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      // Throttle with requestAnimationFrame
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;

        if (loadingRef.current) return;

        const scrollTop = document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;

        if (scrollTop + clientHeight >= scrollHeight - threshold) {
          loadingRef.current = true;
          loadMore();
          // Reset loading flag after a short delay
          setTimeout(() => {
            loadingRef.current = false;
          }, 500);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [loadMore, threshold, enabled]);
}
