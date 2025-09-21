'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Award, Trophy, Star, Calendar, TrendingUp, Film, Check, X, Plus, Edit2, Search } from 'lucide-react';
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

interface BestPictureNominee {
  id: number;
  tmdb_id: number | null;
  ceremony_year: number;
  movie_title: string;
  release_year: number | null;
  is_winner: boolean;
  in_collection: boolean;
  watched: boolean;
  personal_rating: number | null;
  date_watched: string | null;
  movie_details: {
    id: number;
    title: string;
    poster_path: string | null;
    release_date: string;
  } | null;
}

interface BestPictureData {
  nominees: BestPictureNominee[];
  grouped_by_year: Record<number, BestPictureNominee[]>;
  stats: {
    total_nominees: number;
    total_winners: number;
    in_collection: number;
    watched: number;
    unwatched_nominees: number;
    years_covered: number;
  };
}

export default function OscarsPage() {
  const [stats, setStats] = useState<OscarStats | null>(null);
  const [bestPictureData, setBestPictureData] = useState<BestPictureData | null>(null);
  const [activeTab, setActiveTab] = useState<'collection' | 'best-picture'>('collection');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNominee, setEditingNominee] = useState<BestPictureNominee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [oscarResponse, bestPictureResponse] = await Promise.all([
          fetch('/api/oscars'),
          fetch('/api/oscars/best-picture')
        ]);

        const oscarData = await oscarResponse.json();
        const bpData = await bestPictureResponse.json();

        if (oscarData.success) {
          setStats(oscarData.data);
        }
        if (bpData.success) {
          setBestPictureData(bpData.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddToCollection = async (tmdbId: number, title: string) => {
    try {
      const response = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: tmdbId.toString(),
          approval_status: 'approved'
        })
      });

      if (response.ok) {
        // Refresh the data
        const bpResponse = await fetch('/api/oscars/best-picture');
        const bpData = await bpResponse.json();
        if (bpData.success) {
          setBestPictureData(bpData.data);
        }
      }
    } catch (error) {
      console.error('Error adding to collection:', error);
    }
  };

  const searchTMDB = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Error searching TMDB:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const updateNomineeTMDBId = async (nomineeId: number, tmdbId: number) => {
    try {
      const response = await fetch(`/api/oscars/best-picture/${nomineeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: tmdbId })
      });

      if (response.ok) {
        // Refresh the data
        const bpResponse = await fetch('/api/oscars/best-picture');
        const bpData = await bpResponse.json();
        if (bpData.success) {
          setBestPictureData(bpData.data);
        }
        setEditingNominee(null);
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error updating nominee:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cinema-black via-cinema-dark to-cinema-gray flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinema-gold"></div>
      </div>
    );
  }

  if (!stats || !bestPictureData) {
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

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-8">
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setActiveTab('collection')}
            className={cn(
              "px-6 py-3 rounded-full font-medium transition-all duration-300",
              activeTab === 'collection'
                ? "bg-cinema-gold text-black shadow-lg"
                : "bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
            )}
          >
            Your Collection
          </button>
          <button
            onClick={() => setActiveTab('best-picture')}
            className={cn(
              "px-6 py-3 rounded-full font-medium transition-all duration-300",
              activeTab === 'best-picture'
                ? "bg-cinema-gold text-black shadow-lg"
                : "bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
            )}
          >
            Best Picture Tracker
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Collection Tab */}
        {activeTab === 'collection' && (
          <>
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
          </>
        )}

        {/* Best Picture Tracker Tab */}
        {activeTab === 'best-picture' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <p className="text-2xl font-bold text-cinema-gold">{bestPictureData.stats.total_nominees}</p>
                <p className="text-xs text-muted-foreground">Total Nominees</p>
              </div>
              <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <p className="text-2xl font-bold text-green-500">{bestPictureData.stats.watched}</p>
                <p className="text-xs text-muted-foreground">Watched</p>
              </div>
              <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <p className="text-2xl font-bold text-red-500">{bestPictureData.stats.unwatched_nominees}</p>
                <p className="text-xs text-muted-foreground">Unwatched</p>
              </div>
              <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <p className="text-2xl font-bold text-blue-500">{bestPictureData.stats.in_collection}</p>
                <p className="text-xs text-muted-foreground">In Collection</p>
              </div>
              <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <p className="text-2xl font-bold text-yellow-500">{bestPictureData.stats.total_winners}</p>
                <p className="text-xs text-muted-foreground">Winners</p>
              </div>
              <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <p className="text-2xl font-bold text-purple-500">
                  {Math.round((bestPictureData.stats.watched / bestPictureData.stats.total_nominees) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">Completion</p>
              </div>
            </div>

            {/* Year Filter */}
            <div className="mb-6">
              <select
                value={selectedYear || ''}
                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cinema-gold"
              >
                <option value="">All Years</option>
                {Object.keys(bestPictureData.grouped_by_year)
                  .sort((a, b) => parseInt(b) - parseInt(a))
                  .map(year => (
                    <option key={year} value={year}>
                      {year} Ceremony
                    </option>
                  ))}
              </select>
            </div>

            {/* Nominees Grid */}
            <div className="space-y-8">
              {Object.entries(bestPictureData.grouped_by_year)
                .filter(([year]) => !selectedYear || parseInt(year) === selectedYear)
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .map(([year, nominees]) => (
                  <div key={year}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-cinema-gold" />
                      {year} Academy Awards
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {nominees.map((nominee) => (
                        <motion.div
                          key={nominee.id}
                          className={cn(
                            "group relative bg-card/30 backdrop-blur-sm rounded-lg overflow-hidden border transition-all duration-300",
                            nominee.is_winner
                              ? "border-cinema-gold"
                              : "border-border/50",
                            "hover:border-cinema-gold/50"
                          )}
                          whileHover={{ scale: 1.05 }}
                        >
                          {/* Poster Image */}
                          <div className="aspect-[2/3] relative bg-gradient-to-br from-cinema-dark to-cinema-gray">
                            {nominee.movie_details?.poster_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w500${nominee.movie_details.poster_path}`}
                                alt={nominee.movie_title}
                                fill
                                className={cn(
                                  "object-cover transition-all duration-300",
                                  !nominee.in_collection && "grayscale group-hover:grayscale-0"
                                )}
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16.66vw"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Film className="w-12 h-12 text-muted-foreground/30" />
                              </div>
                            )}

                            {/* Winner Badge */}
                            {nominee.is_winner && (
                              <div className="absolute top-2 right-2 bg-cinema-gold text-black px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                Winner
                              </div>
                            )}

                            {/* Status Badge */}
                            <div className="absolute top-2 left-2">
                              {nominee.in_collection && (
                                <div className="bg-green-500/90 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Watched
                                </div>
                              )}
                            </div>

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                                {!nominee.in_collection && (
                                  <>
                                    {nominee.tmdb_id && (
                                      <button
                                        onClick={() => handleAddToCollection(nominee.tmdb_id, nominee.movie_title)}
                                        className="w-full bg-cinema-gold text-black px-3 py-2 rounded-md text-xs font-medium hover:bg-yellow-400 transition-colors flex items-center justify-center gap-1"
                                      >
                                        <Plus className="w-3 h-3" />
                                        Add to Collection
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setEditingNominee(nominee);
                                        setSearchQuery(nominee.movie_title);
                                      }}
                                      className="w-full bg-white/10 backdrop-blur-sm text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      Fix Movie Link
                                    </button>
                                  </>
                                )}
                                {nominee.movie_details && nominee.in_collection && (
                                  <Link
                                    href={`/movies/${nominee.movie_details.id}`}
                                    className="block w-full bg-white/10 backdrop-blur-sm text-white px-3 py-2 rounded-md text-xs font-medium hover:bg-white/20 transition-colors text-center"
                                  >
                                    View Details
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Movie Info */}
                          <div className="p-3">
                            <h4 className={cn(
                              "font-semibold text-sm line-clamp-2 mb-1",
                              nominee.is_winner && "text-cinema-gold"
                            )}>
                              {nominee.movie_title}
                            </h4>
                            {nominee.release_year && (
                              <p className="text-xs text-muted-foreground">
                                {nominee.release_year}
                              </p>
                            )}
                            {nominee.personal_rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="w-3 h-3 fill-current text-yellow-500" />
                                <span className="text-xs">{nominee.personal_rating}/10</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Edit Nominee Modal */}
      {editingNominee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <h3 className="text-xl font-bold mb-4">
              Fix Movie Link for "{editingNominee.movie_title}"
            </h3>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Search for the correct movie on TMDB:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchTMDB(searchQuery)}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:border-cinema-gold"
                  placeholder="Search for movie..."
                />
                <button
                  onClick={() => searchTMDB(searchQuery)}
                  disabled={searchLoading}
                  className="px-4 py-2 bg-cinema-gold text-black rounded-md hover:bg-yellow-400 transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cinema-gold"></div>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {searchResults.slice(0, 6).map((result) => (
                  <button
                    key={result.id}
                    onClick={() => updateNomineeTMDBId(editingNominee.id, result.id)}
                    className="flex gap-3 p-3 bg-background rounded-lg border border-border hover:border-cinema-gold transition-colors text-left"
                  >
                    {result.poster_path && (
                      <Image
                        src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                        alt={result.title}
                        width={60}
                        height={90}
                        className="rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{result.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {result.release_date && new Date(result.release_date).getFullYear()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {result.overview}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditingNominee(null);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="px-4 py-2 border border-border rounded-md hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}