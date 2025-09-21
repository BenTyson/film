'use client';

import { motion } from 'framer-motion';
import { MovieListItem } from './MovieListItem';
import { cn } from '@/lib/utils';
import type { MovieGridItem } from '@/types/movie';

interface MovieListProps {
  movies: MovieGridItem[];
  onMovieSelect?: (movie: MovieGridItem) => void;
  loading?: boolean;
  className?: string;
}

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50">
          <div className="w-12 h-18 bg-muted rounded flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/4" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
      <span className="text-4xl">🎬</span>
    </div>
    <h3 className="text-xl font-semibold mb-2">No movies found</h3>
    <p className="text-muted-foreground max-w-md">
      Try adjusting your search criteria or filters to find the movies you&apos;re looking for.
    </p>
  </div>
);

export function MovieList({
  movies,
  onMovieSelect,
  loading = false,
  className
}: MovieListProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (movies.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        className="space-y-3"
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
              delay: index * 0.03,
              ease: "easeOut"
            }}
          >
            <MovieListItem
              movie={movie}
              onSelect={onMovieSelect}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}