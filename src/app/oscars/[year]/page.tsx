/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Award, Trophy, Star, ArrowLeft, Filter, Calendar } from 'lucide-react';
import { cn, formatYear, getRatingColor } from '@/lib/utils';

interface OscarEntry {
  id: number;
  ceremony_year: number;
  category: string;
  nomination_type: 'won' | 'nominated';
  nominee_name: string | null;
  movie: {
    id: number;
    title: string;
    release_date: string;
    director: string;
    poster_path: string;
    user_movies: Array<{
      personal_rating: number | null;
      is_favorite: boolean;
    }>;
    movie_tags: Array<{
      tag: {
        name: string;
        color: string;
        icon: string;
      };
    }>;
  };
}

interface OscarsPageProps {
  params: Promise<{ year: string }>;
}

export default function OscarYearPage({ params }: OscarsPageProps) {
  const resolvedParams = use(params);
  const [oscars, setOscars] = useState<OscarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  const year = parseInt(resolvedParams.year);

  useEffect(() => {
    const fetchOscarData = async () => {
      try {
        const queryParams = new URLSearchParams({
          year: year.toString(),
          ...(selectedCategory && { category: selectedCategory }),
          ...(selectedType && { type: selectedType }),
        });

        const response = await fetch(`/api/oscars?${queryParams}`);
        const data = await response.json();

        if (data.success) {
          setOscars(data.data);
        }
      } catch (error) {
        console.error('Error fetching Oscar data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOscarData();
  }, [year, selectedCategory, selectedType]);

  const categories = [...new Set(oscars.map(o => o.category))].sort();
  const winners = oscars.filter(o => o.nomination_type === 'won');
  const nominees = oscars.filter(o => o.nomination_type === 'nominated');

  if (loading) {
    return (
      <div className="min-h-screen animated-gradient relative gradient-pulse flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-gradient relative gradient-pulse">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/oscars"
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-purple-400" />
              <h1 className="text-4xl font-heading font-bold">
                {year} Academy Awards
              </h1>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {winners.length} wins, {nominees.length} nominations in your collection
            </p>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Wins & Nominations</option>
                <option value="won">Winners Only</option>
                <option value="nominated">Nominees Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {oscars.length === 0 ? (
          <div className="text-center py-16">
            <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No awards found</h3>
            <p className="text-muted-foreground">
              No movies in your collection have awards for {year} with the current filters.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Group by category */}
            {categories.map(category => {
              const categoryOscars = oscars.filter(o => o.category === category);
              if (categoryOscars.length === 0) return null;

              const categoryWinners = categoryOscars.filter(o => o.nomination_type === 'won');
              const categoryNominees = categoryOscars.filter(o => o.nomination_type === 'nominated');

              return (
                <motion.div
                  key={category}
                  className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Category Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600/10 border-b border-purple-500/20 p-6">
                    <h2 className="text-2xl font-semibold text-purple-400 flex items-center gap-3">
                      <Award className="w-6 h-6" />
                      {category}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {categoryWinners.length} winner{categoryWinners.length !== 1 ? 's' : ''}, {categoryNominees.length} nominee{categoryNominees.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="p-6">
                    {/* Winners */}
                    {categoryWinners.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-purple-400" />
                          Winner{categoryWinners.length > 1 ? 's' : ''}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                          {categoryWinners.map((oscar) => (
                            <MovieCard
                              key={`${oscar.movie.id}-${oscar.id}`}
                              oscar={oscar}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nominees */}
                    {categoryNominees.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Star className="w-5 h-5 text-gray-400" />
                          Nominee{categoryNominees.length > 1 ? 's' : ''}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                          {categoryNominees.map((oscar) => (
                            <MovieCard
                              key={`${oscar.movie.id}-${oscar.id}`}
                              oscar={oscar}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MovieCard({ oscar }: { oscar: OscarEntry }) {
  const userMovie = oscar.movie.user_movies[0];

  return (
    <Link href={`/movies/${oscar.movie.id}?from=oscars`} className="block">
      <motion.div
        className="group relative bg-card/30 backdrop-blur-sm rounded-lg overflow-hidden border border-border/50 hover:border-purple-500/50 transition-all duration-300 cursor-pointer"
        whileHover={{ scale: 1.05 }}
      >
      <div className="aspect-[2/3] relative">
        <Image
          src={oscar.movie.poster_path ? `https://image.tmdb.org/t/p/w500${oscar.movie.poster_path}` : '/placeholder-poster.svg'}
          alt={oscar.movie.title}
          fill
          className="object-cover"
        />

        {/* Award Badge */}
        <div className="absolute top-2 right-2">
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1",
            oscar.nomination_type === 'won'
              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-black"
              : "bg-gray-400 text-black"
          )}>
            {oscar.nomination_type === 'won' ? (
              <Trophy className="w-3 h-3" />
            ) : (
              <Star className="w-3 h-3" />
            )}
            {oscar.nomination_type === 'won' ? 'WON' : 'NOM'}
          </div>
        </div>

        {/* Favorite indicator */}
        {userMovie?.is_favorite && (
          <div className="absolute top-2 left-2">
            <Star className="w-4 h-4 text-red-500 fill-current" />
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{oscar.movie.title}</h3>
        <p className="text-xs text-muted-foreground mb-1">
          {formatYear(oscar.movie.release_date)}
        </p>

        {oscar.nominee_name && (
          <p className="text-xs text-purple-400 mb-2">{oscar.nominee_name}</p>
        )}

        {userMovie?.personal_rating && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-current text-accent" />
            <span className={cn("text-xs", getRatingColor(userMovie.personal_rating))}>
              {userMovie.personal_rating}/10
            </span>
          </div>
        )}

        {/* Tags */}
        {oscar.movie.movie_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {oscar.movie.movie_tags.slice(0, 2).map((movieTag, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: movieTag.tag.color ? `${movieTag.tag.color}20` : 'rgba(255,255,255,0.1)',
                  color: movieTag.tag.color || 'inherit',
                }}
              >
                {movieTag.tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
      </motion.div>
    </Link>
  );
}