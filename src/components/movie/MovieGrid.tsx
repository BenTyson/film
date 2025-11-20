/* eslint-disable react/no-unescaped-entities */
'use client';

import { motion } from 'framer-motion';
import { MovieCard } from './MovieCard';
import { cn } from '@/lib/utils';
import type { MovieGridItem } from '@/types/movie';

interface MovieGridProps {
  movies: MovieGridItem[];
  onMovieSelect?: (movie: MovieGridItem) => void;
  loading?: boolean;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
  context?: 'collection' | 'watchlist' | 'oscars' | 'vault';
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-muted rounded-lg aspect-[2/3] mb-3" />
          <div className="bg-muted h-4 rounded mb-2" />
          <div className="bg-muted h-3 rounded w-1/2" />
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
      <span className="text-4xl">🎬</span>
    </div>
    <h3 className="text-xl font-semibold mb-2">No movies found</h3>
    <p className="text-muted-foreground max-w-md">
      Try adjusting your search criteria or filters to find the movies you're looking for.
    </p>
  </div>
);

export function MovieGrid({
  movies,
  onMovieSelect,
  loading = false,
  className,
  columns = 6,
  context = 'collection'
}: MovieGridProps) {
  const gridColsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (movies.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        className={cn(
          "grid gap-4 auto-rows-max",
          gridColsClass[columns]
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {movies.map((movie, index) => (
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: index * 0.05,
              ease: "easeOut"
            }}
          >
            <MovieCard
              movie={movie}
              onSelect={onMovieSelect}
              context={context}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}