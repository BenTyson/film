import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollectionFilters } from './useCollectionFilters';

describe('useCollectionFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useCollectionFilters());

      expect(result.current.filters).toEqual({
        search: '',
        year: '',
        tag: '',
        favorites: false,
        oscarStatus: '',
        sortBy: 'date_watched',
        sortOrder: 'desc',
      });
    });

    it('should accept initial filter values', () => {
      const { result } = renderHook(() =>
        useCollectionFilters({
          initialFilters: {
            search: 'test',
            year: '2023',
            sortBy: 'title',
          },
        })
      );

      expect(result.current.filters.search).toBe('test');
      expect(result.current.filters.year).toBe('2023');
      expect(result.current.filters.sortBy).toBe('title');
      // Other values should be defaults
      expect(result.current.filters.tag).toBe('');
      expect(result.current.filters.sortOrder).toBe('desc');
    });
  });

  describe('setters', () => {
    it('should update search', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setSearch('Oppenheimer');
      });

      expect(result.current.filters.search).toBe('Oppenheimer');
    });

    it('should update year', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setYear('2024');
      });

      expect(result.current.filters.year).toBe('2024');
    });

    it('should update tag', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setTag('favorites');
      });

      expect(result.current.filters.tag).toBe('favorites');
    });

    it('should update favorites', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setFavorites(true);
      });

      expect(result.current.filters.favorites).toBe(true);
    });

    it('should update oscarStatus', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setOscarStatus('won');
      });

      expect(result.current.filters.oscarStatus).toBe('won');
    });

    it('should update sortBy', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setSortBy('title');
      });

      expect(result.current.filters.sortBy).toBe('title');
    });

    it('should update sortOrder', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setSortOrder('asc');
      });

      expect(result.current.filters.sortOrder).toBe('asc');
    });

    it('should toggle sortOrder', () => {
      const { result } = renderHook(() => useCollectionFilters());

      expect(result.current.filters.sortOrder).toBe('desc');

      act(() => {
        result.current.toggleSortOrder();
      });

      expect(result.current.filters.sortOrder).toBe('asc');

      act(() => {
        result.current.toggleSortOrder();
      });

      expect(result.current.filters.sortOrder).toBe('desc');
    });
  });

  describe('debouncedSearch', () => {
    it('should debounce search value', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setSearch('test');
      });

      // Immediate: debouncedSearch should still be empty
      expect(result.current.debouncedSearch).toBe('');

      // After debounce delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.debouncedSearch).toBe('test');
    });

    it('should respect custom debounce delay', () => {
      const { result } = renderHook(() =>
        useCollectionFilters({ searchDebounceMs: 500 })
      );

      act(() => {
        result.current.setSearch('test');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.debouncedSearch).toBe('');

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.debouncedSearch).toBe('test');
    });
  });

  describe('resetFilters', () => {
    it('should reset all filters to initial values', () => {
      const { result } = renderHook(() => useCollectionFilters());

      // Set various filters
      act(() => {
        result.current.setSearch('test');
        result.current.setYear('2023');
        result.current.setTag('action');
        result.current.setFavorites(true);
        result.current.setSortBy('title');
        result.current.setSortOrder('asc');
      });

      // Reset
      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters).toEqual({
        search: '',
        year: '',
        tag: '',
        favorites: false,
        oscarStatus: '',
        sortBy: 'date_watched',
        sortOrder: 'desc',
      });
    });

    it('should reset to custom initial values', () => {
      const { result } = renderHook(() =>
        useCollectionFilters({
          initialFilters: { sortBy: 'title', sortOrder: 'asc' },
        })
      );

      act(() => {
        result.current.setSearch('test');
        result.current.setSortBy('release_date');
      });

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters.sortBy).toBe('title');
      expect(result.current.filters.sortOrder).toBe('asc');
    });
  });

  describe('hasActiveFilters', () => {
    it('should be false when no filters are active', () => {
      const { result } = renderHook(() => useCollectionFilters());

      expect(result.current.hasActiveFilters).toBe(false);
    });

    it('should be true when search is active', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setSearch('test');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when year is active', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setYear('2023');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when favorites is active', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setFavorites(true);
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should not consider sort as active filter', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setSortBy('title');
        result.current.setSortOrder('asc');
      });

      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('buildParams', () => {
    it('should build params with debounced search', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setSearch('test');
      });

      // Before debounce
      let params = result.current.buildParams();
      expect(params.get('search')).toBeNull();

      // After debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      params = result.current.buildParams();
      expect(params.get('search')).toBe('test');
    });

    it('should include year when set', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setYear('2023');
      });

      const params = result.current.buildParams();
      expect(params.get('year')).toBe('2023');
    });

    it('should include favorites when true', () => {
      const { result } = renderHook(() => useCollectionFilters());

      act(() => {
        result.current.setFavorites(true);
      });

      const params = result.current.buildParams();
      expect(params.get('favorites')).toBe('true');
    });

    it('should always include sortBy and sortOrder', () => {
      const { result } = renderHook(() => useCollectionFilters());

      const params = result.current.buildParams();
      expect(params.get('sortBy')).toBe('date_watched');
      expect(params.get('sortOrder')).toBe('desc');
    });

    it('should include additional params', () => {
      const { result } = renderHook(() => useCollectionFilters());

      const params = result.current.buildParams({ page: '2', limit: '50' });
      expect(params.get('page')).toBe('2');
      expect(params.get('limit')).toBe('50');
    });
  });
});
