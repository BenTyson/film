/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Star, Calendar, Award, Users, User, Heart, Home, RotateCcw } from 'lucide-react';
import { formatYear, formatRating, getRatingColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { MovieGridItem } from '@/types/movie';

interface MovieCardProps {
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

export function MovieCard({ movie, onSelect, className }: MovieCardProps) {
  const hasOscarWins = movie.oscar_badges.wins > 0;
  const hasOscarNominations = movie.oscar_badges.nominations > 0;
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-poster.svg';

  const handleClick = () => {
    onSelect?.(movie);
  };

  return (
    <motion.div
      className={cn(
        "group relative bg-card rounded-lg overflow-hidden border border-border/50 cursor-pointer movie-card",
        className
      )}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={handleClick}
    >
      {/* Poster Image */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <Image
          src={posterUrl}
          alt={movie.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Oscar Badges */}
        {(hasOscarWins || hasOscarNominations) && (
          <div className="absolute top-2 right-2 flex gap-1">
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

        {/* Favorite Heart */}
        {movie.is_favorite && (
          <div className="absolute top-2 left-2">
            <Heart className="w-5 h-5 text-red-500 fill-current" />
          </div>
        )}

        {/* Hover Overlay Content */}
        <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="text-white">
            {movie.personal_rating && (
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 fill-current text-accent" />
                <span className={cn("text-sm font-medium", getRatingColor(movie.personal_rating))}>
                  {formatRating(movie.personal_rating)}
                </span>
              </div>
            )}

            {movie.date_watched && (
              <div className="text-xs text-muted-foreground mb-2">
                Watched {new Date(movie.date_watched).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer - Always Visible */}
      <div className="p-3">
        <h3 className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {movie.title}
        </h3>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            {formatYear(movie.release_date)}{movie.director ? ` | ${movie.director}` : ''}
          </span>
          {movie.personal_rating && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-current text-accent" />
              <span className={cn("text-xs font-medium", getRatingColor(movie.personal_rating))}>
                {movie.personal_rating}
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {movie.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {movie.tags.slice(0, 3).map((tag, index) => {
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
            {movie.tags.length > 3 && (
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                +{movie.tags.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subtle Glow Effect on Hover */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-lg shadow-2xl shadow-primary/20" />
      </div>
    </motion.div>
  );
}