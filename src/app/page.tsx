'use client';

import { useState, useEffect } from 'react';
import { Search, Grid, List, Grid3X3, LayoutGrid, Grip, ArrowUp, ArrowDown, Award, Users, Plus, Clapperboard } from 'lucide-react';
import { MovieGrid } from '@/components/movie/MovieGrid';
import { MovieList } from '@/components/movie/MovieList';
import { MovieDetailsModal } from '@/components/movie/MovieDetailsModal';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { MovieGridItem } from '@/types/movie';

interface MoviesResponse {
  success: boolean;
  data: {
    movies: MovieGridItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    totalMovies: number;
  };
}

const navItems = [
  { href: '/', label: 'Collection', icon: Clapperboard },
  { href: '/oscars', label: 'Oscars', icon: Award },
  { href: '/buddy/calen', label: 'Calen', icon: Users },
  { href: '/add', label: 'Add', icon: Plus },
];

export default function HomePage() {
  const pathname = usePathname();
  const [movies, setMovies] = useState<MovieGridItem[]>([]);
  const [totalMovies, setTotalMovies] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_watched');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedYear, setSelectedYear] = useState('');
  const [yearCounts, setYearCounts] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridColumns, setGridColumns] = useState<4 | 5 | 6>(6);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  // Debounce search query with improved cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const fetchMovies = async (page = 1, append = false) => {
    // Create AbortController for request cancellation
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30000); // 30 second timeout

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentPage(1);
      setHasNextPage(true);
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(selectedYear && { year: selectedYear }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/movies?${params}`, {
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId); // Clear timeout if request completes

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: MoviesResponse = await response.json();

      if (data.success) {
        if (append) {
          setMovies(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMovies = data.data.movies.filter(m => !existingIds.has(m.id));
            return [...prev, ...newMovies];
          });
        } else {
          setMovies(data.data.movies);
        }
        setTotalMovies(data.data.totalMovies);
        setCurrentPage(page);
        setHasNextPage(data.data.pagination.hasNext);
      } else {
        console.error('API returned error:', data.error);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was cancelled');
      } else {
        console.error('Error fetching movies:', error);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setLoadingMore(false);
    }

    // Return cleanup function
    return () => {
      abortController.abort();
      clearTimeout(timeoutId);
    };
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const loadMovies = async () => {
      cleanup = await fetchMovies();
    };

    loadMovies();

    return () => {
      if (cleanup) cleanup();
    };
  }, [debouncedSearchQuery, selectedYear, sortBy, sortOrder]);

  // Fetch year counts on component mount
  useEffect(() => {
    fetchYearCounts();
  }, []);

  // Detect scroll for compact header with improved cleanup
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    // Add passive option for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Infinite scroll detection with throttling for better performance
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (
            window.innerHeight + document.documentElement.scrollTop >=
            document.documentElement.offsetHeight - 1000 && // Trigger 1000px before bottom
            !loading &&
            !loadingMore &&
            hasNextPage
          ) {
            fetchMovies(currentPage + 1, true);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    // Add passive option for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loading, loadingMore, hasNextPage, currentPage]);

  const loadMoreMovies = () => {
    if (!loading && !loadingMore && hasNextPage) {
      fetchMovies(currentPage + 1, true);
    }
  };

  const handleMovieSelect = (movie: MovieGridItem) => {
    setSelectedMovieId(movie.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMovieId(null);
    // Refresh the movies list to show any updates
    fetchMovies();
  };

  const fetchYearCounts = async () => {
    try {
      const response = await fetch('/api/movies/years');
      const data = await response.json();

      if (data.success) {
        const counts: Record<string, number> = {};
        data.data.forEach((item: { year: string; count: number }) => {
          counts[item.year] = item.count;
        });
        setYearCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching year counts:', error);
    }
  };


  const sortOptions = [
    { label: 'Date Watched', value: 'date_watched' },
    { label: 'Title', value: 'title' },
    { label: 'Release Date', value: 'release_date' },
    { label: 'Personal Rating', value: 'personal_rating' },
  ];

  return (
    <div className="min-h-screen animated-gradient relative gradient-pulse">
      {/* Unified Navigation + Controls Header */}
      <div className={`border-b border-gray-800/50 bg-black/60 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-lg' : 'border-white/10'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">

          {/* Normal State: Two Rows - Clean and Efficient */}
          {!isScrolled && (
            <div className="space-y-3 py-3 sm:py-4">

              {/* Row 1: Navigation + Movie Count */}
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

                {/* Movie Count */}
                <span className="hidden sm:block text-gray-400 text-sm font-medium px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50 whitespace-nowrap">
                  {loading ? 'Loading...' :
                    searchQuery || selectedYear ?
                      `${movies.length} of ${totalMovies} found` :
                      `${movies.length} of ${totalMovies} movies`
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
                    placeholder="Search movies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all text-white placeholder-gray-400 min-h-[44px]"
                  />
                </div>

                {/* Controls - Responsive Layout */}
                <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-start sm:justify-end">

                  {/* Year Filter */}
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-medium text-white text-sm sm:text-base min-w-[120px] min-h-[44px]"
                  >
                    <option value="" className="bg-gray-800 text-white">All Years</option>
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const years = [];
                      for (let year = currentYear; year >= 1950; year--) {
                        years.push(year);
                      }

                      const sortedYears = years.sort((a, b) => b - a);

                      return sortedYears.map(year => {
                        const count = yearCounts[year.toString()] || 0;
                        if (count > 0 || year >= currentYear - 4) {
                          const formatCount = (num: number) => {
                            return num.toString().split('').map(digit => {
                              const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
                              return subscripts[parseInt(digit)];
                            }).join('');
                          };

                          return (
                            <option key={year} value={year.toString()} className="bg-gray-800 text-white">
                              {year}{count > 0 ? ` · ${formatCount(count)}` : ''}
                            </option>
                          );
                        }
                        return null;
                      }).filter(Boolean);
                    })()}
                  </select>

                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-medium text-white text-sm sm:text-base min-w-[120px] min-h-[44px]"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value} className="bg-gray-800 text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {/* Sort Order Toggle */}
                  <div className="flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                    <button
                      onClick={() => setSortOrder('asc')}
                      className={`p-3 transition-all min-h-[44px] min-w-[44px] ${sortOrder === 'asc' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                      title="Oldest first"
                    >
                      <ArrowUp className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSortOrder('desc')}
                      className={`p-3 transition-all min-h-[44px] min-w-[44px] ${sortOrder === 'desc' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                      title="Newest first"
                    >
                      <ArrowDown className="w-5 h-5" />
                    </button>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-3 transition-all min-h-[44px] min-w-[44px] ${viewMode === 'grid' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-3 transition-all min-h-[44px] min-w-[44px] ${viewMode === 'list' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Grid Density Toggle - Desktop Only */}
                  {viewMode === 'grid' && (
                    <div className="hidden lg:flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                      <button
                        onClick={() => setGridColumns(4)}
                        className={`p-3 transition-all min-h-[44px] min-w-[44px] ${gridColumns === 4 ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        title="4 columns"
                      >
                        <LayoutGrid className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setGridColumns(5)}
                        className={`p-3 transition-all min-h-[44px] min-w-[44px] ${gridColumns === 5 ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        title="5 columns"
                      >
                        <Grid3X3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setGridColumns(6)}
                        className={`p-3 transition-all min-h-[44px] min-w-[44px] ${gridColumns === 6 ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                        title="6 columns"
                      >
                        <Grip className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Compact State: Single Row */}
          {isScrolled && (
            <motion.div
              className="flex items-center gap-2 py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >

              {/* Navigation - Compact */}
              <div className="flex items-center gap-1">
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        className={cn(
                          "relative flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-all duration-300 min-h-[40px] min-w-[40px]",
                          isActive
                            ? "text-black bg-white"
                            : "text-white/70 hover:text-white hover:bg-white/10"
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <IconComponent className="w-4 h-4" />
                      </motion.div>
                    </Link>
                  );
                })}
              </div>

              {/* Search - Compact */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-white placeholder-gray-400 text-sm"
                />
              </div>

              {/* Essential Controls - Compact */}
              <div className="flex items-center gap-1">

                {/* Sort Order Toggle - Always Visible */}
                <div className="flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                  <button
                    onClick={() => setSortOrder('asc')}
                    className={`p-2 transition-all ${sortOrder === 'asc' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                    title="Oldest first"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSortOrder('desc')}
                    className={`p-2 transition-all ${sortOrder === 'desc' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                    title="Newest first"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                {/* View Mode Toggle - Always Visible */}
                <div className="flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-all ${viewMode === 'grid' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-all ${viewMode === 'list' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Sort & Year - Desktop Only in Compact Mode */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="hidden sm:block px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm min-w-[100px]"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="hidden md:block px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm min-w-[80px]"
                >
                  <option value="">All</option>
                  {(() => {
                    const currentYear = new Date().getFullYear();
                    const years = [];
                    for (let year = currentYear; year >= 1950; year--) {
                      years.push(year);
                    }
                    return years.sort((a, b) => b - a).slice(0, 10).map(year => {
                      const count = yearCounts[year.toString()] || 0;
                      if (count > 0) {
                        return (
                          <option key={year} value={year.toString()} className="bg-gray-800">
                            {year}
                          </option>
                        );
                      }
                      return null;
                    }).filter(Boolean);
                  })()}
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Movie Grid/List */}
        {viewMode === 'grid' ? (
          <MovieGrid
            movies={movies}
            onMovieSelect={handleMovieSelect}
            loading={loading}
            columns={gridColumns}
          />
        ) : (
          <MovieList
            movies={movies}
            onMovieSelect={handleMovieSelect}
            loading={loading}
          />
        )}

        {/* Load More Section */}
        {!loading && movies.length > 0 && (
          <div className="mt-8 text-center">
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Loading more movies...
              </div>
            )}

            {!loadingMore && hasNextPage && (
              <button
                onClick={loadMoreMovies}
                className="px-6 py-3 bg-card/50 hover:bg-card/80 border border-border/50 rounded-lg text-foreground transition-colors"
              >
                Load More Movies
              </button>
            )}

            {!hasNextPage && movies.length > 0 && (
              <p className="text-muted-foreground">
                You&apos;ve reached the end of your collection
              </p>
            )}
          </div>
        )}

        {/* Movie Details Modal */}
        <MovieDetailsModal
          movieId={selectedMovieId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
}