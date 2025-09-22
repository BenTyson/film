'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Award, Search, RefreshCw, Clapperboard, Users, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface OscarOverview {
  overview: {
    total_nominations: number;
    total_categories: number;
    total_oscar_movies: number;
    movies_in_collection_with_oscars: number;
    oscar_data_entries: number;
    year_range: {
      start: number;
      end: number;
    };
    collection_coverage: {
      oscar_movies_available: number;
      in_collection: number;
      percentage: string;
    };
  };
  categories: Array<{
    id: number;
    name: string;
    category_group: string;
    nomination_count: number;
  }>;
  decades: Array<{
    decade: string;
    start_year: number;
    end_year: number;
    nomination_count: number;
  }>;
  recent_winners: Array<{
    movie_id: number;
    title: string;
    poster_path: string | null;
    tmdb_id: number;
    year: number;
    category: string;
  }>;
  top_winners: Array<{
    id: number;
    title: string;
    poster_path: string | null;
    tmdb_id: number;
    win_count: number;
  }>;
}

interface OscarNomination {
  id: number;
  ceremony_year: number;
  category: string;
  category_group: string;
  nominee_name: string | null;
  is_winner: boolean;
  movie: {
    id: number;
    title: string;
    tmdb_id: number;
    imdb_id: string;
  } | null;
}

interface MovieWithOscars {
  id: number;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  nominations: OscarNomination[];
  in_collection: boolean;
  watched: boolean;
}

const navItems = [
  { href: '/', label: 'Collection', icon: Clapperboard },
  { href: '/oscars', label: 'Oscars', icon: Award },
  { href: '/buddy/calen', label: 'Calen', icon: Users },
  { href: '/add', label: 'Add', icon: Plus },
];

export default function OscarsPage() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overviewData, setOverviewData] = useState<OscarOverview | null>(null);
  const [nominations, setNominations] = useState<OscarNomination[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null);
  const [searchYear, setSearchYear] = useState('');
  const [movieData, setMovieData] = useState<Record<number, MovieWithOscars>>({});
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'Best Picture', name: 'Best Picture' },
    { id: 'Best Director', name: 'Best Director' },
    { id: 'Best Actor', name: 'Best Actor' },
    { id: 'Best Actress', name: 'Best Actress' }
  ];

  // Scroll detection for sticky header behavior
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    fetchOscarData();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchYearNominations(selectedYear);
    } else if (selectedDecade) {
      fetchDecadeNominations(selectedDecade);
    } else {
      fetchAllNominations();
    }
  }, [selectedCategory, selectedYear, selectedDecade]);

  // Auto-refresh on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && Object.keys(movieData).length > 0) {
        // Only refresh if we have data and page becomes visible
        const moviesToCheck = Object.values(movieData).filter(movie => !movie.in_collection);
        if (moviesToCheck.length > 0) {
          refreshCollectionStatus();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [movieData]);

  const fetchOscarData = async () => {
    try {
      const response = await fetch('/api/oscars/overview');
      const data = await response.json();
      if (data.success) {
        setOverviewData(data.data);
      }
    } catch (error) {
      console.error('Error fetching Oscar overview:', error);
    }
  };

  const fetchAllNominations = async () => {
    setLoading(true);
    try {
      // Fetch recent years for initial display
      const recentYears = [];
      const currentYear = new Date().getFullYear();
      for (let year = 2023; year >= 2014; year--) {
        recentYears.push(year);
      }

      const allNominations: OscarNomination[] = [];
      const movies: Record<number, MovieWithOscars> = {};

      for (const year of recentYears) {
        const url = selectedCategory === 'all'
          ? `/api/oscars/years/${year}`
          : `/api/oscars/nominations?year=${year}&category=${selectedCategory}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          const yearNominations = data.data.nominations || data.data;
          allNominations.push(...yearNominations);

          // Process movies for this year
          yearNominations.forEach((nom: OscarNomination) => {
            if (nom.movie) {
              const movieId = nom.movie.tmdb_id;
              if (!movies[movieId]) {
                movies[movieId] = {
                  id: nom.movie.id,
                  tmdb_id: nom.movie.tmdb_id,
                  title: nom.movie.title,
                  poster_path: null,
                  release_date: '',
                  nominations: [],
                  in_collection: false,
                  watched: true // Default to true (not grayed) for movies not in collection
                };
              }
              movies[movieId].nominations.push(nom);
            }
          });
        }
      }

      // Check collection status for movies
      await checkCollectionStatus(Object.values(movies));

      setNominations(allNominations);
      setMovieData(movies);
    } catch (error) {
      console.error('Error fetching nominations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchYearNominations = async (year: number) => {
    setLoading(true);
    try {
      const url = selectedCategory === 'all'
        ? `/api/oscars/years/${year}`
        : `/api/oscars/nominations?year=${year}&category=${selectedCategory}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const yearNominations = data.data.nominations || data.data;
        setNominations(yearNominations);

        // Process movies
        const movies: Record<number, MovieWithOscars> = {};
        yearNominations.forEach((nom: OscarNomination) => {
          if (nom.movie) {
            const movieId = nom.movie.tmdb_id;
            if (!movies[movieId]) {
              movies[movieId] = {
                id: nom.movie.id,
                tmdb_id: nom.movie.tmdb_id,
                title: nom.movie.title,
                poster_path: null,
                release_date: '',
                nominations: [],
                in_collection: false,
                watched: true // Default to true (not grayed) for movies not in collection
              };
            }
            movies[movieId].nominations.push(nom);
          }
        });

        await checkCollectionStatus(Object.values(movies));
        setMovieData(movies);
      }
    } catch (error) {
      console.error('Error fetching year nominations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDecadeNominations = async (decade: string) => {
    setLoading(true);
    const startYear = parseInt(decade);
    const endYear = startYear + 9;

    try {
      const allNominations: OscarNomination[] = [];
      const movies: Record<number, MovieWithOscars> = {};

      for (let year = endYear; year >= startYear; year--) {
        const url = selectedCategory === 'all'
          ? `/api/oscars/years/${year}`
          : `/api/oscars/nominations?year=${year}&category=${selectedCategory}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          const yearNominations = data.data.nominations || data.data;
          allNominations.push(...yearNominations);

          yearNominations.forEach((nom: OscarNomination) => {
            if (nom.movie) {
              const movieId = nom.movie.tmdb_id;
              if (!movies[movieId]) {
                movies[movieId] = {
                  id: nom.movie.id,
                  tmdb_id: nom.movie.tmdb_id,
                  title: nom.movie.title,
                  poster_path: null,
                  release_date: '',
                  nominations: [],
                  in_collection: false,
                  watched: true // Default to true (not grayed) for movies not in collection
                };
              }
              movies[movieId].nominations.push(nom);
            }
          });
        }
      }

      await checkCollectionStatus(Object.values(movies));
      setNominations(allNominations);
      setMovieData(movies);
    } catch (error) {
      console.error('Error fetching decade nominations:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCollectionStatus = async (movies: MovieWithOscars[]) => {
    // Check if movies are in collection and if they've been watched
    for (const movie of movies) {
      try {
        const response = await fetch(`/api/movies?search=${encodeURIComponent(movie.title)}&limit=5`);
        const data = await response.json();

        if (data.success && data.data.movies.length > 0) {
          // First try exact TMDB ID match
          let collectionMovie = data.data.movies.find((m: any) => m.tmdb_id === movie.tmdb_id);

          // Fallback: try title-based matching if TMDB ID match fails
          if (!collectionMovie) {
            collectionMovie = data.data.movies.find((m: any) =>
              m.title.toLowerCase().trim() === movie.title.toLowerCase().trim()
            );
          }

          if (collectionMovie) {
            movie.in_collection = true;
            movie.watched = true; // All movies in collection are watched
            movie.poster_path = collectionMovie.poster_path;
            movie.release_date = collectionMovie.release_date;
          } else {
            // Movie not in collection - fetch TMDB poster
            movie.watched = false; // Not in collection = not watched
            await fetchTMDBPoster(movie);
          }
        } else {
          // Movie not in collection - fetch TMDB poster
          movie.watched = false; // Not in collection = not watched
          await fetchTMDBPoster(movie);
        }
      } catch (error) {
        console.error('Error checking collection status:', error);
        // If API call fails, try to fetch TMDB poster
        await fetchTMDBPoster(movie);
      }
    }
  };

  const fetchTMDBPoster = async (movie: MovieWithOscars) => {
    try {
      // Use the TMDB API endpoint
      const tmdbResponse = await fetch(`/api/tmdb/movie/${movie.tmdb_id}`);
      if (tmdbResponse.ok) {
        const response = await tmdbResponse.json();
        if (response.success && response.data) {
          if (response.data.poster_path) {
            movie.poster_path = response.data.poster_path;
          }
          if (response.data.release_date) {
            movie.release_date = response.data.release_date;
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching TMDB data for ${movie.title}:`, error);
    }
  };

  const refreshCollectionStatus = async () => {
    setRefreshing(true);
    try {
      // Only refresh movies that are currently marked as not in collection
      const moviesToCheck = Object.values(movieData).filter(movie => !movie.in_collection);
      if (moviesToCheck.length > 0) {
        await checkCollectionStatus(moviesToCheck);
        // Update the movie data state with refreshed status
        setMovieData(prevData => ({ ...prevData }));
      }
    } catch (error) {
      console.error('Error refreshing collection status:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleYearSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(searchYear);
    if (year >= 1928 && year <= 2023) {
      setSelectedYear(year);
      setSelectedDecade(null);
    }
  };

  // Group nominations by year
  const nominationsByYear = nominations.reduce((acc, nom) => {
    if (!acc[nom.ceremony_year]) {
      acc[nom.ceremony_year] = [];
    }
    acc[nom.ceremony_year].push(nom);
    return acc;
  }, {} as Record<number, OscarNomination[]>);

  const sortedYears = Object.keys(nominationsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cinema-black via-cinema-dark to-cinema-gray">
      {/* Header - Exact Main Page Layout */}
      <div className={`border-b border-gray-800/50 bg-black/60 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-lg' : 'border-white/10'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">

          {/* Normal State: Two Rows - Clean and Efficient */}
          {!isScrolled && (
            <div className="space-y-3 py-3 sm:py-4">

              {/* Row 1: Navigation + Oscar Count */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-between gap-3"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {/* Navigation */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {navItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link key={item.href} href={item.href}>
                        <motion.div
                          className={cn(
                            "relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px]",
                            isActive
                              ? "text-black"
                              : "text-white/70 hover:text-white"
                          )}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 bg-white rounded-xl shadow-lg"
                              layoutId="activeNav"
                              transition={{ duration: 0.3, ease: "easeOut" }}
                            />
                          )}
                          <IconComponent className="w-4 h-4 relative z-10" />
                          <span className="relative z-10 hidden sm:inline">{item.label}</span>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>

                {/* Oscar Count */}
                <span className="hidden sm:block text-gray-400 text-sm font-medium px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50 whitespace-nowrap">
                  {loading ? 'Loading...' :
                    overviewData ? `${overviewData.overview.movies_in_collection_with_oscars} Oscar Movies in Collection` :
                    'Oscar Collection'
                  }
                </span>
              </motion.div>

              {/* Row 2: Search + All Controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">

                {/* Search */}
                <div className="relative flex-1 max-w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search Oscar movies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all text-white placeholder-gray-400 min-h-[44px]"
                  />
                </div>

                {/* Controls - Responsive Layout */}
                <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-start sm:justify-end">

                  {/* Category Filter */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedYear(null);
                      setSelectedDecade(null);
                    }}
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-medium text-white text-sm sm:text-base min-w-[140px] min-h-[44px]"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id} className="bg-gray-800 text-white">
                        {category.name}
                      </option>
                    ))}
                  </select>

                  {/* Year Filter */}
                  <select
                    value={selectedYear || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedYear(parseInt(e.target.value));
                        setSelectedDecade(null);
                      } else {
                        setSelectedYear(null);
                        setSelectedDecade(null);
                      }
                    }}
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-medium text-white text-sm sm:text-base min-w-[120px] min-h-[44px]"
                  >
                    <option value="" className="bg-gray-800 text-white">All Years</option>
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const years = [];
                      for (let year = currentYear; year >= 1928; year--) {
                        years.push(year);
                      }
                      return years.map(year => (
                        <option key={year} value={year.toString()} className="bg-gray-800 text-white">
                          {year}
                        </option>
                      ));
                    })()}
                  </select>

                  {/* Year Search */}
                  <form onSubmit={handleYearSearch} className="flex gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="1928"
                        max="2023"
                        value={searchYear}
                        onChange={(e) => setSearchYear(e.target.value)}
                        placeholder="Jump..."
                        className="pl-3 pr-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-white text-sm sm:text-base w-20 sm:w-24 min-h-[44px]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-2 sm:py-3 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors text-sm sm:text-base min-h-[44px]"
                    >
                      Go
                    </button>
                  </form>

                  {/* Refresh Button */}
                  <div className="flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                    <button
                      onClick={refreshCollectionStatus}
                      disabled={refreshing}
                      className={`p-3 transition-all min-h-[44px] min-w-[44px] ${
                        refreshing
                          ? 'text-gray-500 cursor-not-allowed'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                      title="Refresh collection status"
                    >
                      <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compact State: Single Row */}
          {isScrolled && (
            <motion.div
              className="flex items-center justify-between gap-3 py-3"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* Navigation + Category */}
              <div className="flex items-center gap-3">
                {/* Home Link */}
                <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Collection
                </Link>
                <span className="text-gray-500">/</span>
                <span className="text-yellow-500 font-medium text-sm">Oscars</span>

                {/* Active Category Indicator */}
                {selectedCategory !== 'all' && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-300 text-sm">{categories.find(c => c.id === selectedCategory)?.name}</span>
                  </>
                )}
              </div>

              {/* Quick Controls */}
              <div className="flex items-center gap-2">
                {/* Year Display */}
                {(selectedYear || selectedDecade) && (
                  <span className="text-yellow-500 text-sm font-medium px-2 py-1 bg-yellow-500/10 rounded">
                    {selectedYear || selectedDecade}
                  </span>
                )}

                {/* Refresh Button */}
                <button
                  onClick={refreshCollectionStatus}
                  disabled={refreshing}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    refreshing
                      ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                      : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white"
                  )}
                  title="Refresh collection status"
                >
                  <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-12">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Nominations by Year */}
            {sortedYears.map((year) => {
              const yearNoms = nominationsByYear[year];
              if (!yearNoms) return null;

              const yearMovies = new Map<number, MovieWithOscars>();

              // Group by movie
              yearNoms.forEach(nom => {
                if (nom.movie) {
                  const tmdbId = nom.movie.tmdb_id;
                  if (!yearMovies.has(tmdbId)) {
                    yearMovies.set(tmdbId, movieData[tmdbId] || {
                      id: nom.movie.id,
                      tmdb_id: tmdbId,
                      title: nom.movie.title,
                      poster_path: null,
                      release_date: '',
                      nominations: [],
                      in_collection: false,
                      watched: true // Default to true (not grayed) for movies not in collection
                    });
                  }
                }
              });

              const winners = yearNoms.filter(n => n.is_winner);

              return (
                <div key={year} className="border border-gray-800 rounded-xl overflow-hidden">
                  {/* Enhanced Year Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700/50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* Year + Stats */}
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-yellow-500">{year}</span>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span>{yearNoms.length} nominations</span>
                          <span>•</span>
                          <span>{winners.length} wins</span>
                          <span>•</span>
                          <span>{Array.from(yearMovies.values()).filter(m => m.in_collection).length} in collection</span>
                        </div>
                      </div>

                      {/* Quick Year Navigation */}
                      <div className="flex items-center gap-2">
                        {/* Previous Year */}
                        {sortedYears.indexOf(year) > 0 && (
                          <button
                            onClick={() => {
                              setSelectedYear(sortedYears[sortedYears.indexOf(year) - 1]);
                              setSelectedDecade(null);
                            }}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
                            title={`Go to ${sortedYears[sortedYears.indexOf(year) - 1]}`}
                          >
                            ←
                          </button>
                        )}

                        {/* Current Year Indicator */}
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg text-xs font-medium">
                          {year}
                        </span>

                        {/* Next Year */}
                        {sortedYears.indexOf(year) < sortedYears.length - 1 && (
                          <button
                            onClick={() => {
                              setSelectedYear(sortedYears[sortedYears.indexOf(year) + 1]);
                              setSelectedDecade(null);
                            }}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
                            title={`Go to ${sortedYears[sortedYears.indexOf(year) + 1]}`}
                          >
                            →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Year Content */}
                  <div className="p-6 bg-gray-900/50">
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {Array.from(yearMovies.values()).map((movie) => {
                              const wins = movie.nominations.filter(n => n.is_winner);
                              const isWinner = wins.length > 0;
                              const posterUrl = movie.poster_path
                                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                                : '/placeholder-movie.jpg';

                              return (
                                <Link
                                  key={movie.tmdb_id}
                                  href={`/movies/${movie.id}`}
                                  className="group relative"
                                >
                                  <div
                                    className={cn(
                                      "relative rounded-lg overflow-hidden transition-all duration-300",
                                      isWinner ? "ring-2 ring-yellow-500" : "ring-1 ring-gray-700",
                                      "hover:ring-2 hover:ring-yellow-400 hover:scale-105"
                                    )}
                                  >
                                    {/* Poster */}
                                    <div className="aspect-[2/3] relative">
                                      <Image
                                        src={posterUrl}
                                        alt={movie.title}
                                        fill
                                        className={cn(
                                          "object-cover",
                                          !movie.in_collection && "grayscale opacity-70"
                                        )}
                                      />


                                      {/* Oscar Badges */}
                                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                                        {wins.length > 0 && (
                                          <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                                            🏆 {wins.length}
                                          </div>
                                        )}
                                        {movie.nominations.length > wins.length && (
                                          <div className="bg-gray-700 text-white text-xs px-2 py-1 rounded-full">
                                            {movie.nominations.length - wins.length}
                                          </div>
                                        )}
                                      </div>

                                    </div>

                                    {/* Title */}
                                    <div className="p-2 bg-gray-800">
                                      <h3 className="text-sm font-medium text-white truncate">
                                        {movie.title}
                                      </h3>
                                      <div className="text-xs text-gray-400 mt-1">
                                        {movie.nominations.map(n => n.category).join(', ')}
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}