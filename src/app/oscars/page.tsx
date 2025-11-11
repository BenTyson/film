/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Award, Search, RefreshCw, Clapperboard, Users, Plus, Edit, Film, Archive, LayoutGrid, Table } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { MovieDetailsModal } from '@/components/movie/MovieDetailsModal';
import { EditOscarMovieModal } from '@/components/oscar/EditOscarMovieModal';
import OscarTableView from '@/components/oscar/OscarTableView';

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
    in_collection?: boolean;
    collection_id?: number | null;
    poster_path?: string | null;
  } | null;
}

interface MovieWithOscars {
  id: number;
  collection_id: number | null;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  nominations: OscarNomination[];
  in_collection: boolean;
  watched: boolean;
}

const allNavItems = [
  { href: '/', label: 'Collection', icon: Clapperboard },
  { href: '/oscars', label: 'Oscars', icon: Award },
  { href: '/buddy/calen', label: 'Calen', icon: Users, adminOnly: true },
  { href: '/watchlist', label: 'Watchlist', icon: Film },
  { href: '/vaults', label: 'Vaults', icon: Archive },
  { href: '/add', label: 'Add', icon: Plus },
];

export default function OscarsPage() {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overviewData, setOverviewData] = useState<OscarOverview | null>(null);
  const [nominations, setNominations] = useState<OscarNomination[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Best Picture');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null);
  const [searchYear, setSearchYear] = useState('');
  const [movieData, setMovieData] = useState<Record<number, MovieWithOscars>>({});
  const [loadedYears, setLoadedYears] = useState<number[]>([]);
  const [hasMoreYears, setHasMoreYears] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOscarMovie, setEditingOscarMovie] = useState<{id: number; title: string; tmdb_id: number | null; imdb_id: string | null} | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Check admin status from database
  useEffect(() => {
    async function checkAdminStatus() {
      if (!isSignedIn) {
        setIsAdmin(false);
        return;
      }

      try {
        const response = await fetch('/api/user/me');
        if (!response.ok) {
          setIsAdmin(false);
          return;
        }

        const data = await response.json();
        setIsAdmin(data.success && data.data?.role === 'admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    }

    checkAdminStatus();
  }, [isSignedIn, user?.id]);

  // Filter nav items based on admin status
  const navItems = allNavItems.filter(item => {
    if (item.adminOnly) {
      return isAdmin;
    }
    return true;
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const categories = [
    { id: 'Best Picture', name: 'Best Picture' },
    { id: 'Best Director', name: 'Best Director' },
    { id: 'Best Actor', name: 'Best Actor' },
    { id: 'Best Actress', name: 'Best Actress' },
    { id: 'all', name: 'All Categories' }
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
      // Load only recent years initially for better performance
      const initialYears = [2025, 2024, 2023];
      await loadYearsData(initialYears, false);
      setLoadedYears(initialYears);

      // Check if there are more years to load
      setHasMoreYears(true);
    } catch (error) {
      console.error('Error fetching nominations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadYearsData = async (years: number[], append = true) => {
    const allNominations: OscarNomination[] = append ? [...nominations] : [];
    const movies: Record<number, MovieWithOscars> = append ? { ...movieData } : {};

    for (const year of years) {
      // For 'all' use the years endpoint, for specific categories use nominations endpoint
      const url = selectedCategory === 'all'
        ? `/api/oscars/years/${year}`
        : `/api/oscars/nominations?year=${year}&category=${encodeURIComponent(selectedCategory)}`;

      try {
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
                collection_id: nom.movie.collection_id || null,
                tmdb_id: nom.movie.tmdb_id,
                title: nom.movie.title,
                poster_path: nom.movie.poster_path || null,
                release_date: '',
                nominations: [],
                in_collection: nom.movie.in_collection || false,
                watched: false
              };
            }
            movies[movieId].nominations.push(nom);
          }
        });
        } else {
          console.error(`Failed to load year ${year}:`, data.error);
        }
      } catch (error) {
        console.error(`Error loading year ${year}:`, error);
      }
    }

    setNominations(allNominations);
    setMovieData(movies);
  };

  const loadMoreYears = async () => {
    if (loadingMore || !hasMoreYears) return;

    setLoadingMore(true);
    try {
      // Get the actual years that are currently displayed
      const displayedYears = Object.keys(nominationsByYear).map(Number).sort((a, b) => b - a);

      // Find the oldest year currently displayed
      const oldestDisplayedYear = displayedYears.length > 0
        ? Math.min(...displayedYears)
        : 2025; // fallback to most recent year

      const nextYears = [];
      const startYear = oldestDisplayedYear - 1;

      // Load 3 more years at a time
      for (let year = startYear; year >= Math.max(startYear - 2, 1928); year--) {
        nextYears.push(year);
      }

      if (nextYears.length === 0 || startYear < 1928) {
        setHasMoreYears(false);
        return;
      }

      await loadYearsData(nextYears, true);
      setLoadedYears([...loadedYears, ...nextYears]);

      // Check if we've reached the beginning of Oscar history
      if (startYear - 2 < 1928) {
        setHasMoreYears(false);
      }
    } catch (error) {
      console.error('Error loading more years:', error);
    } finally {
      setLoadingMore(false);
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

        // Process movies with collection status from API
        const movies: Record<number, MovieWithOscars> = {};
        yearNominations.forEach((nom: OscarNomination) => {
          if (nom.movie) {
            const movieId = nom.movie.tmdb_id;
            if (!movies[movieId]) {
              movies[movieId] = {
                id: nom.movie.id,
                collection_id: nom.movie.collection_id || null,
                tmdb_id: nom.movie.tmdb_id,
                title: nom.movie.title,
                poster_path: nom.movie.poster_path || null,
                release_date: '',
                nominations: [],
                in_collection: nom.movie.in_collection || false,
                watched: false
              };
            }
            movies[movieId].nominations.push(nom);
          }
        });

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
                  collection_id: nom.movie.collection_id || null,
                  tmdb_id: nom.movie.tmdb_id,
                  title: nom.movie.title,
                  poster_path: nom.movie.poster_path || null,
                  release_date: '',
                  nominations: [],
                  in_collection: nom.movie.in_collection || false,
                  watched: false
                };
              }
              movies[movieId].nominations.push(nom);
            }
          });
        }
      }

      setNominations(allNominations);
      setMovieData(movies);
    } catch (error) {
      console.error('Error fetching decade nominations:', error);
    } finally {
      setLoading(false);
    }
  };



  const refreshCollectionStatus = async () => {
    setRefreshing(true);
    try {
      // Reload current data to get updated collection status
      if (selectedYear) {
        await fetchYearNominations(selectedYear);
      } else if (selectedDecade) {
        await fetchDecadeNominations(selectedDecade);
      } else {
        await fetchAllNominations();
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
    if (year >= 1928 && year <= 2025) {
      setSelectedYear(year);
      setSelectedDecade(null);
    }
  };

  const handleMovieClick = (movie: MovieWithOscars) => {
    // Only open modal if movie is in collection
    if (movie.in_collection && movie.collection_id) {
      setSelectedMovieId(movie.collection_id);
      setIsModalOpen(true);
    }
    // For movies not in collection, we could show a different modal or do nothing
    // For now, we'll just not open the modal
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMovieId(null);
    // Optionally refresh data if needed
    // fetchOscarData();
  };

  const handleEditOscarMovie = (e: React.MouseEvent, movie: MovieWithOscars) => {
    e.stopPropagation(); // Prevent movie click
    setEditingOscarMovie({
      id: movie.id,
      title: movie.title,
      tmdb_id: movie.tmdb_id,
      imdb_id: null // We'll need to add this to the interface if needed
    });
    setIsEditModalOpen(true);
  };

  const handleOscarMovieUpdated = () => {
    // Refresh the data to show updated movie
    if (selectedYear) {
      fetchYearNominations(selectedYear);
    } else if (selectedDecade) {
      fetchDecadeNominations(selectedDecade);
    } else {
      fetchAllNominations();
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
    <div className="min-h-screen animated-gradient relative gradient-pulse">
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
                <div className="flex items-center gap-3">
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

                  {/* Auth Section */}
                  <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                    {isSignedIn ? (
                      <UserButton
                        afterSignOutUrl="/sign-in"
                        appearance={{
                          elements: {
                            avatarBox: 'w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity',
                            userButtonPopoverCard: 'bg-black/90 backdrop-blur-xl border border-white/10',
                            userButtonPopoverActionButton: 'hover:bg-white/10 text-white',
                            userButtonPopoverActionButtonText: 'text-white',
                            userButtonPopoverActionButtonIcon: 'text-white',
                            userButtonPopoverFooter: 'hidden',
                            userPreviewMainIdentifier: 'text-white',
                            userPreviewSecondaryIdentifier: 'text-gray-400',
                          },
                          variables: {
                            colorText: '#ffffff',
                            colorTextSecondary: '#9ca3af',
                          }
                        }}
                        showName={false}
                      />
                    ) : (
                      <Link href="/sign-in">
                        <motion.button
                          className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white rounded-xl transition-colors min-h-[44px]"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Sign In
                        </motion.button>
                      </Link>
                    )}
                  </div>
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
                        max="2025"
                        value={searchYear}
                        onChange={(e) => setSearchYear(e.target.value)}
                        placeholder="Jump..."
                        className="pl-3 pr-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-white text-sm sm:text-base w-20 sm:w-24 min-h-[44px]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors text-sm sm:text-base min-h-[44px]"
                    >
                      Go
                    </button>
                  </form>

                  {/* View Toggle */}
                  <div className="flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-3 transition-all min-h-[44px] min-w-[44px] ${
                        viewMode === 'grid'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                      title="Grid view"
                    >
                      <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-3 transition-all min-h-[44px] min-w-[44px] ${
                        viewMode === 'table'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                      title="Table view"
                    >
                      <Table className="w-5 h-5" />
                    </button>
                  </div>

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
                <span className="text-purple-400 font-medium text-sm">Oscars</span>

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
                  <span className="text-purple-400 text-sm font-medium px-2 py-1 bg-purple-500/10 rounded">
                    {selectedYear || selectedDecade}
                  </span>
                )}

                {/* View Toggle */}
                <div className="flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-all ${
                      viewMode === 'grid'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 transition-all ${
                      viewMode === 'table'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                    title="Table view"
                  >
                    <Table className="w-4 h-4" />
                  </button>
                </div>

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
        ) : viewMode === 'table' ? (
          <div className="mt-8">
            <OscarTableView />
          </div>
        ) : (
          <div className="space-y-8 mt-8">

            {/* Nominations by Year */}
            {sortedYears.map((year) => {
              const yearNoms = nominationsByYear[year];
              if (!yearNoms) return null;

              const yearMovies = new Map<number, MovieWithOscars>();

              // Group by movie
              yearNoms.forEach(nom => {
                // Handle both nominations with and without movies
                const movieId = nom.movie?.tmdb_id || nom.id; // Use nomination ID as fallback
                const movieTitle = nom.movie?.title || nom.nominee_name || 'Unknown Film';

                if (!yearMovies.has(movieId)) {
                  // Get movie data but DON'T include old nominations
                  const existingMovieData = movieData[movieId];
                  yearMovies.set(movieId, {
                    id: nom.movie?.id || nom.id,
                    collection_id: null,
                    tmdb_id: nom.movie?.tmdb_id || 0,
                    title: movieTitle,
                    poster_path: existingMovieData?.poster_path || null,
                    release_date: existingMovieData?.release_date || '',
                    nominations: [nom], // Only this year's nominations
                    in_collection: existingMovieData?.in_collection || false,
                    watched: existingMovieData?.watched || false
                  });
                } else {
                  const existing = yearMovies.get(movieId);
                  if (existing) {
                    existing.nominations.push(nom);
                  }
                }
              });

              const winners = yearNoms.filter(n => n.is_winner);

              return (
                <div key={year} className="border border-gray-800 rounded-xl overflow-hidden">
                  {/* Simple Year Header */}
                  <div className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900">
                    <span className="text-xl font-bold text-purple-400">{year}</span>
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
                                <div
                                  key={movie.tmdb_id}
                                  onClick={() => handleMovieClick(movie)}
                                  className={cn(
                                    "group relative cursor-pointer",
                                    movie.in_collection ? "" : "cursor-not-allowed"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "relative rounded-lg overflow-hidden transition-all duration-300",
                                      isWinner ? "ring-2 ring-yellow-500" : "ring-1 ring-gray-700",
                                      movie.in_collection ? "hover:ring-2 hover:ring-yellow-400 hover:scale-105" : ""
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
                                        loading="lazy"
                                        placeholder="blur"
                                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkrHB/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAhEQACAQIHAQAAAAAAAAAAAAABAgADBBEFITFRkbHB/9oADAMBAAIRAxEAPwCdwLjXeriXKEfVZP8AqgNbvmrYhOnBKyRSjJZW9n8iuFuOGcRIZmHvOwzmz3aKRRq"
                                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                                      />


                                      {/* Oscar Badges */}
                                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                                        {wins.length > 0 && (
                                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                            🏆 {wins.length}
                                          </div>
                                        )}
                                        {movie.nominations.length > wins.length && (
                                          <div className="bg-gray-700 text-white text-xs px-2 py-1 rounded-full">
                                            {movie.nominations.length - wins.length}
                                          </div>
                                        )}
                                      </div>

                                      {/* Edit Button */}
                                      <button
                                        onClick={(e) => handleEditOscarMovie(e, movie)}
                                        className="absolute top-2 left-2 p-2 bg-gray-900/80 hover:bg-yellow-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Edit TMDB match"
                                      >
                                        <Edit className="w-4 h-4 text-white" />
                                      </button>

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
                                </div>
                              );
                            })}
                          </div>
                  </div>
                </div>
              );
            })}

            {/* Load More Button / Loading Indicator */}
            {hasMoreYears && (
              <div className="text-center py-8">
                {loadingMore ? (
                  <div className="flex justify-center items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                    <span className="text-gray-400">Loading more years...</span>
                  </div>
                ) : (
                  <button
                    onClick={loadMoreYears}
                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700 hover:border-gray-600"
                  >
                    Load More Years
                  </button>
                )}
              </div>
            )}

            {!hasMoreYears && loadedYears.length > 3 && (
              <div className="text-center py-8">
                <span className="text-gray-500 text-sm">
                  All Oscar years loaded ({loadedYears.length} years)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Movie Details Modal */}
      <MovieDetailsModal
        movieId={selectedMovieId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Edit Oscar Movie Modal */}
      {editingOscarMovie && (
        <EditOscarMovieModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          oscarMovie={editingOscarMovie}
          onMovieUpdated={handleOscarMovieUpdated}
        />
      )}
    </div>
  );
}