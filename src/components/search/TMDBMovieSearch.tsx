'use client';

import { useTMDBSearch } from '@/hooks';
import { TMDBEnhancedSearchResult } from '@/types/tmdb';
import { TMDBSearchInput } from './TMDBSearchInput';
import { MovieSearchResultCard } from './MovieSearchResultCard';

interface TMDBMovieSearchProps {
  /**
   * Callback when a movie is selected
   */
  onMovieSelect: (movie: TMDBEnhancedSearchResult) => void;
  /**
   * ID of the movie currently being added (shows loading state)
   */
  addingMovieId?: number | null;
  /**
   * Search input placeholder text
   */
  placeholder?: string;
  /**
   * Whether to auto-focus the search input
   */
  autoFocus?: boolean;
  /**
   * Custom action icon for search results
   */
  actionIcon?: React.ReactNode;
  /**
   * Label above the search section
   */
  label?: string;
  /**
   * Maximum height for search results (with scroll)
   */
  maxResultsHeight?: string;
}

/**
 * Combined TMDB movie search component
 * Provides search input, results list, and empty/loading states
 */
export function TMDBMovieSearch({
  onMovieSelect,
  addingMovieId = null,
  placeholder = 'Search for movies...',
  autoFocus = false,
  actionIcon,
  label = 'Search for Movie',
  maxResultsHeight = '24rem',
}: TMDBMovieSearchProps) {
  const { query, setQuery, results, isLoading } = useTMDBSearch();

  return (
    <div className="space-y-4">
      {label && (
        <h3 className="text-sm font-medium text-gray-400">{label}</h3>
      )}

      <TMDBSearchInput
        value={query}
        onChange={setQuery}
        isLoading={isLoading}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />

      {/* Search Results */}
      {results.length > 0 && (
        <div
          className="space-y-2 overflow-y-auto"
          style={{ maxHeight: maxResultsHeight }}
        >
          {results.map((result) => (
            <MovieSearchResultCard
              key={result.id}
              movie={result}
              onSelect={onMovieSelect}
              isLoading={addingMovieId === result.id}
              actionIcon={actionIcon}
            />
          ))}
        </div>
      )}

      {/* No Results State */}
      {!isLoading && query && results.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No results found for &quot;{query}&quot;</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
