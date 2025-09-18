'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Award, Trophy, Star, Calendar, TrendingUp, Film } from 'lucide-react';
import { cn, formatYear } from '@/lib/utils';

interface OscarStats {
  overview: {
    total_oscar_movies: number;
    total_wins: number;
    total_nominations: number;
    total_awards: number;
  };
  by_year: Array<{
    year: number;
    count: number;
  }>;
  by_category: Array<{
    category: string;
    count: number;
  }>;
  most_awarded_movies: Array<{
    id: number;
    title: string;
    release_date: string;
    poster_path: string;
    oscar_wins: number;
    personal_rating: number | null;
  }>;
}

export default function OscarsPage() {
  const [stats, setStats] = useState<OscarStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOscarStats = async () => {
      try {
        const response = await fetch('/api/oscars');
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching Oscar stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOscarStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cinema-black via-cinema-dark to-cinema-gray flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinema-gold"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cinema-black via-cinema-dark to-cinema-gray flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load Oscar data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cinema-black via-cinema-dark to-cinema-gray">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cinema-gold/20 to-cinema-accent/20 opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <motion.div
              className="flex justify-center mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="p-6 bg-cinema-gold/10 rounded-full backdrop-blur-sm border border-cinema-gold/20">
                <Award className="w-20 h-20 text-cinema-gold" />
              </div>
            </motion.div>

            <motion.h1
              className="text-6xl font-heading font-bold mb-6 bg-gradient-to-r from-cinema-gold to-yellow-300 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Oscar Collection
            </motion.h1>

            <motion.p
              className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Explore Academy Award-winning and nominated films in your collection.
              From Best Picture winners to breakthrough performances.
            </motion.p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-6 border border-border/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cinema-gold/10 rounded-lg">
                <Film className="w-6 h-6 text-cinema-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overview.total_oscar_movies}</p>
                <p className="text-sm text-muted-foreground">Oscar Movies</p>
              </div>
            </div>
          </div>

          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-6 border border-border/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cinema-gold/10 rounded-lg">
                <Trophy className="w-6 h-6 text-cinema-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overview.total_wins}</p>
                <p className="text-sm text-muted-foreground">Wins</p>
              </div>
            </div>
          </div>

          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-6 border border-border/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-400/10 rounded-lg">
                <Star className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overview.total_nominations}</p>
                <p className="text-sm text-muted-foreground">Nominations</p>
              </div>
            </div>
          </div>

          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-6 border border-border/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overview.total_awards}</p>
                <p className="text-sm text-muted-foreground">Total Awards</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Most Awarded Movies */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-3xl font-heading font-semibold mb-8 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-cinema-gold" />
            Most Awarded Movies
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {stats.most_awarded_movies.map((movie, index) => (
              <motion.div
                key={movie.id}
                className="group relative bg-card/30 backdrop-blur-sm rounded-lg overflow-hidden border border-border/50 hover:border-cinema-gold/50 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="aspect-[2/3] relative">
                  <Image
                    src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/placeholder-poster.svg'}
                    alt={movie.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-cinema-gold text-black px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {movie.oscar_wins}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{movie.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatYear(movie.release_date)}
                  </p>
                  {movie.personal_rating && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-3 h-3 fill-current text-accent" />
                      <span className="text-xs">{movie.personal_rating}/10</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Oscar Years */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-3xl font-heading font-semibold mb-8 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-cinema-gold" />
            Browse by Year
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stats.by_year.map((yearData) => (
              <Link
                key={yearData.year}
                href={`/oscars/${yearData.year}`}
                className="group"
              >
                <motion.div
                  className="bg-card/30 backdrop-blur-sm rounded-lg p-6 border border-border/50 hover:border-cinema-gold/50 transition-all duration-300 text-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <p className="text-2xl font-bold text-cinema-gold mb-2">{yearData.year}</p>
                  <p className="text-sm text-muted-foreground">
                    {yearData.count} award{yearData.count !== 1 ? 's' : ''}
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h2 className="text-3xl font-heading font-semibold mb-8 flex items-center gap-3">
            <Award className="w-8 h-8 text-cinema-gold" />
            Categories in Collection
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.by_category.map((categoryData, index) => (
              <motion.div
                key={categoryData.category}
                className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + index * 0.05 }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{categoryData.category}</span>
                  <span className="text-cinema-gold font-bold">{categoryData.count}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}