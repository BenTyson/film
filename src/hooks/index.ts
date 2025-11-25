/**
 * Custom React Hooks
 * Centralized exports for all custom hooks
 */

export { useDebounce, useDebouncedCallback } from './useDebounce';
export { useTMDBSearch } from './useTMDBSearch';
export {
  useCollectionFilters,
  type CollectionFilters,
  type SortField,
  type SortOrder,
  type UseCollectionFiltersOptions,
  type UseCollectionFiltersResult,
} from './useCollectionFilters';
export {
  useMovieCollection,
  useInfiniteScroll,
  type PaginationInfo,
  type UseMovieCollectionOptions,
  type UseMovieCollectionResult,
} from './useMovieCollection';
