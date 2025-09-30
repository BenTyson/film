'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Star, Calendar, Award, Users, User, Heart, Home, RotateCcw } from 'lucide-react';
import { formatYear, formatRating, getRatingColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { MovieGridItem } from '@/types/movie';

interface MovieListItemProps {
  movie: MovieGridItem;
  onSelect?: (movie: MovieGridItem) => void;
  className?: string;
}

const iconMap = {
  Users,
  User,
  Heart,
  Home,
  RotateCcw,
};

export function MovieListItem({ movie, onSelect, className }: MovieListItemProps) {
  const hasOscarWins = movie.oscar_badges.wins > 0;
  const hasOscarNominations = movie.oscar_badges.nominations > 0;
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
    : '/placeholder-poster.svg';

  const handleClick = () => {
    onSelect?.(movie);
  };

  return (
    <motion.div
      className={cn(
        "group relative bg-card hover:bg-card/80 border border-border/50 hover:border-border rounded-lg overflow-hidden cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:shadow-primary/10",
        className
      )}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={handleClick}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Poster Thumbnail */}
        <div className="relative w-12 h-18 flex-shrink-0 rounded overflow-hidden">
          <Image
            src={posterUrl}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="48px"
          />
          {movie.is_favorite && (
            <div className="absolute top-1 right-1">
              <Heart className="w-3 h-3 text-red-500 fill-current" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            {/* Title and Metadata */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight truncate group-hover:text-primary transition-colors">
                {movie.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatYear(movie.release_date)}</span>
                {movie.director && (
                  <>
                    <span>•</span>
                    <span className="truncate">{movie.director}</span>
                  </>
                )}
              </div>
            </div>

            {/* Right Side Metadata */}
            <div className="flex items-center gap-6 flex-shrink-0">
              {/* Personal Rating */}
              {movie.personal_rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current text-accent" />
                  <span className={cn("font-medium", getRatingColor(movie.personal_rating))}>
                    {formatRating(movie.personal_rating)}
                  </span>
                </div>
              )}

              {/* Date Watched */}
              {movie.date_watched && (
                <div className="text-sm text-muted-foreground hidden md:block">
                  {new Date(movie.date_watched).toLocaleDateString()}
                </div>
              )}

              {/* Oscar Badges */}
              {(hasOscarWins || hasOscarNominations) && (
                <div className="flex gap-1">
                  {hasOscarWins && (
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {movie.oscar_badges.wins}
                    </div>
                  )}
                  {movie.oscar_badges.nominations > movie.oscar_badges.wins && (
                    <div className="bg-cinema-silver text-cinema-black px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {movie.oscar_badges.nominations - movie.oscar_badges.wins}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tags Row */}
          {movie.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {movie.tags.slice(0, 4).map((tag, index) => {
                const IconComponent = iconMap[tag.icon as keyof typeof iconMap] || User;
                return (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}20` : 'rgba(255,255,255,0.1)',
                      borderColor: tag.color || 'rgba(255,255,255,0.2)',
                      color: tag.color || 'inherit',
                      border: '1px solid'
                    }}
                  >
                    <IconComponent className="w-3 h-3" />
                    <span>{tag.name}</span>
                  </div>
                );
              })}
              {movie.tags.length > 4 && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  +{movie.tags.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subtle Glow Effect on Hover */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="absolute inset-0 rounded-lg shadow-lg shadow-primary/20" />
      </div>
    </motion.div>
  );
}