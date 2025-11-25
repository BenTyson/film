'use client';

import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TMDBSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  label?: string;
}

/**
 * Reusable TMDB search input component with loading indicator
 */
export function TMDBSearchInput({
  value,
  onChange,
  isLoading = false,
  placeholder = 'Search for movies...',
  className,
  autoFocus = false,
  label = 'Search movies',
}: TMDBSearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={label}
        className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-400"
      />
      {isLoading && (
        <Loader2
          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin"
          aria-hidden="true"
        />
      )}
      {isLoading && <span className="sr-only">Loading search results</span>}
    </div>
  );
}
