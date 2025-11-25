'use client';

import { useMemo, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Calendar, User, Star, Plus, Loader2 } from 'lucide-react';
import { TMDBEnhancedSearchResult } from '@/types/tmdb';
import { getPosterURL } from '@/lib/tmdb-helpers';

interface MovieSearchResultCardProps {
  movie: TMDBEnhancedSearchResult;
  onSelect: (movie: TMDBEnhancedSearchResult) => void;
  isLoading?: boolean;
  actionIcon?: React.ReactNode;
}

/**
 * Reusable movie search result card component
 * Used in AddToVaultModal, AddToWatchlistModal, and other search contexts
 */
function MovieSearchResultCardComponent({
  movie,
  onSelect,
  isLoading = false,
  actionIcon,
}: MovieSearchResultCardProps) {
  // Memoize computed values
  const posterUrl = useMemo(
    () => getPosterURL(movie.poster_path, 'small') || '/placeholder-poster.svg',
    [movie.poster_path]
  );

  const releaseYear = useMemo(
    () => movie.release_date ? new Date(movie.release_date).getFullYear() : null,
    [movie.release_date]
  );

  const handleClick = useCallback(() => {
    if (!isLoading) {
      onSelect(movie);
    }
  }, [isLoading, onSelect, movie]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-all cursor-pointer group"
      onClick={handleClick}
    >
      <div className="flex items-start gap-4">
        <Image
          src={posterUrl}
          alt={movie.title}
          width={48}
          height={72}
          className="w-12 h-18 object-cover rounded flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate">{movie.title}</h4>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
            {releaseYear && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {releaseYear}
              </span>
            )}
            {movie.director && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {movie.director}
              </span>
            )}
            {movie.vote_average > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {movie.vote_average.toFixed(1)}
              </span>
            )}
          </div>
          {movie.overview && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{movie.overview}</p>
          )}
        </div>
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
        ) : (
          actionIcon || (
            <Plus className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
          )
        )}
      </div>
    </motion.div>
  );
}

// Memoize the component to prevent unnecessary re-renders in search result lists
export const MovieSearchResultCard = memo(MovieSearchResultCardComponent);
