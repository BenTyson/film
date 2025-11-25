/**
 * useTMDBSearch Hook
 * Handles TMDB movie search with debouncing and loading states.
 */

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { TMDBEnhancedSearchResult } from '@/types/tmdb';
import { API_ENDPOINTS } from '@/lib/constants';

interface UseTMDBSearchOptions {
  /**
   * Debounce delay in milliseconds (default: 300ms)
   */
  debounceMs?: number;
  /**
   * Minimum query length before searching (default: 1)
   */
  minQueryLength?: number;
  /**
   * Whether to use enhanced search (includes director, runtime, etc.)
   */
  enhanced?: boolean;
  /**
   * Filter by release year
   */
  year?: number;
}

interface UseTMDBSearchResult {
  /**
   * Current search query
   */
  query: string;
  /**
   * Update the search query
   */
  setQuery: (query: string) => void;
  /**
   * Search results from TMDB
   */
  results: TMDBEnhancedSearchResult[];
  /**
   * Whether a search is in progress
   */
  isLoading: boolean;
  /**
   * Error message if search failed
   */
  error: string | null;
  /**
   * Clear search results and query
   */
  clear: () => void;
}

/**
 * Hook for searching TMDB movies with debouncing
 */
export function useTMDBSearch(options: UseTMDBSearchOptions = {}): UseTMDBSearchResult {
  const {
    debounceMs = 300,
    minQueryLength = 1,
    enhanced = true,
    year,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TMDBEnhancedSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, debounceMs);

  const searchTMDB = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < minQueryLength) {
      setResults([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.TMDB_SEARCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          enhanced,
          ...(year && { year }),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
      } else {
        setError(data.error || 'Search failed');
        setResults([]);
      }
    } catch (err) {
      console.error('Error searching TMDB:', err);
      setError('Failed to search movies');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [enhanced, year, minQueryLength]);

  // Perform search when debounced query changes
  useEffect(() => {
    searchTMDB(debouncedQuery);
  }, [debouncedQuery, searchTMDB]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clear,
  };
}
