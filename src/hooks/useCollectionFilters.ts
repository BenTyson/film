/**
 * useCollectionFilters Hook
 * Manages filter and sort state for movie collections
 */

import { useState, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';

export type SortField = 'date_watched' | 'title' | 'release_date' | 'personal_rating' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface CollectionFilters {
  search: string;
  year: string;
  tag: string;
  favorites: boolean;
  oscarStatus: 'nominated' | 'won' | 'any' | '';
  sortBy: SortField;
  sortOrder: SortOrder;
}

export interface UseCollectionFiltersOptions {
  /**
   * Initial filter values
   */
  initialFilters?: Partial<CollectionFilters>;
  /**
   * Debounce delay for search in milliseconds (default: 300)
   */
  searchDebounceMs?: number;
}

export interface UseCollectionFiltersResult {
  /**
   * Current filter values
   */
  filters: CollectionFilters;
  /**
   * Debounced search query for API calls
   */
  debouncedSearch: string;
  /**
   * Set search query
   */
  setSearch: (search: string) => void;
  /**
   * Set year filter
   */
  setYear: (year: string) => void;
  /**
   * Set tag filter
   */
  setTag: (tag: string) => void;
  /**
   * Toggle favorites filter
   */
  setFavorites: (favorites: boolean) => void;
  /**
   * Set Oscar status filter
   */
  setOscarStatus: (status: CollectionFilters['oscarStatus']) => void;
  /**
   * Set sort field
   */
  setSortBy: (sortBy: SortField) => void;
  /**
   * Set sort order
   */
  setSortOrder: (sortOrder: SortOrder) => void;
  /**
   * Toggle sort order between asc and desc
   */
  toggleSortOrder: () => void;
  /**
   * Reset all filters to initial values
   */
  resetFilters: () => void;
  /**
   * Check if any filters are active
   */
  hasActiveFilters: boolean;
  /**
   * Build URL search params from current filters
   */
  buildParams: (additionalParams?: Record<string, string>) => URLSearchParams;
}

const DEFAULT_FILTERS: CollectionFilters = {
  search: '',
  year: '',
  tag: '',
  favorites: false,
  oscarStatus: '',
  sortBy: 'date_watched',
  sortOrder: 'desc',
};

/**
 * Hook for managing collection filter and sort state
 */
export function useCollectionFilters(
  options: UseCollectionFiltersOptions = {}
): UseCollectionFiltersResult {
  const { initialFilters = {}, searchDebounceMs = 300 } = options;

  const initialState = useMemo(
    () => ({ ...DEFAULT_FILTERS, ...initialFilters }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Only compute once
  );

  const [filters, setFilters] = useState<CollectionFilters>(initialState);
  const debouncedSearch = useDebounce(filters.search, searchDebounceMs);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setYear = useCallback((year: string) => {
    setFilters((prev) => ({ ...prev, year }));
  }, []);

  const setTag = useCallback((tag: string) => {
    setFilters((prev) => ({ ...prev, tag }));
  }, []);

  const setFavorites = useCallback((favorites: boolean) => {
    setFilters((prev) => ({ ...prev, favorites }));
  }, []);

  const setOscarStatus = useCallback((oscarStatus: CollectionFilters['oscarStatus']) => {
    setFilters((prev) => ({ ...prev, oscarStatus }));
  }, []);

  const setSortBy = useCallback((sortBy: SortField) => {
    setFilters((prev) => ({ ...prev, sortBy }));
  }, []);

  const setSortOrder = useCallback((sortOrder: SortOrder) => {
    setFilters((prev) => ({ ...prev, sortOrder }));
  }, []);

  const toggleSortOrder = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialState);
  }, [initialState]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.year !== '' ||
      filters.tag !== '' ||
      filters.favorites ||
      filters.oscarStatus !== ''
    );
  }, [filters]);

  const buildParams = useCallback(
    (additionalParams: Record<string, string> = {}): URLSearchParams => {
      const params = new URLSearchParams();

      // Use debounced search for API calls
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      if (filters.year) {
        params.set('year', filters.year);
      }

      if (filters.tag) {
        params.set('tag', filters.tag);
      }

      if (filters.favorites) {
        params.set('favorites', 'true');
      }

      if (filters.oscarStatus) {
        params.set('oscarStatus', filters.oscarStatus);
      }

      params.set('sortBy', filters.sortBy);
      params.set('sortOrder', filters.sortOrder);

      // Add any additional params
      Object.entries(additionalParams).forEach(([key, value]) => {
        params.set(key, value);
      });

      return params;
    },
    [debouncedSearch, filters]
  );

  return {
    filters,
    debouncedSearch,
    setSearch,
    setYear,
    setTag,
    setFavorites,
    setOscarStatus,
    setSortBy,
    setSortOrder,
    toggleSortOrder,
    resetFilters,
    hasActiveFilters,
    buildParams,
  };
}
