'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Grid, List, Star, Calendar, Award, Users, Plus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { MovieGrid } from '@/components/movie/MovieGrid';
import { MovieDetailsModal } from '@/components/movie/MovieDetailsModal';
import { motion } from 'framer-motion';
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

export default function MoviesPage() {
  const [movies, setMovies] = useState<MovieGridItem[]>([]);
  const [totalMovies, setTotalMovies] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy, setSortBy] = useState('date_watched');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchMovies = async (page = 1, append = false) => {
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
        ...(selectedTag && { tag: selectedTag }),
        sortBy,
        sortOrder: 'desc',
      });

      const response = await fetch(`/api/movies?${params}`);
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
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, [debouncedSearchQuery, selectedTag, sortBy]);

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 && // Trigger 1000px before bottom
        !loading &&
        !loadingMore &&
        hasNextPage
      ) {
        fetchMovies(currentPage + 1, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  const quickFilters = [
    { label: 'All Movies', value: '', icon: Grid },
    { label: 'Favorites', value: 'favorites', icon: Star },
    { label: 'Calen Movies', value: 'Calen', icon: Users },
    { label: 'Oscar Winners', value: 'oscar-winners', icon: Award },
    { label: 'Recent', value: 'recent', icon: Calendar },
    { label: 'Low Confidence', value: 'low-confidence', icon: AlertTriangle },
  ];

  const sortOptions = [
    { label: 'Date Watched', value: 'date_watched' },
    { label: 'Title', value: 'title' },
    { label: 'Release Date', value: 'release_date' },
    { label: 'Personal Rating', value: 'personal_rating' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cinema-black via-cinema-dark to-cinema-gray">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/20 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title and Stats */}
            <div className="flex items-center justify-between w-full lg:w-auto">
              <div>
                <h1 className="text-3xl font-heading font-bold mb-2">My Movies</h1>
                <p className="text-muted-foreground">
                  {loading ? 'Loading...' :
                    searchQuery || selectedTag ?
                      `Showing ${movies.length} of ${totalMovies} movies found` :
                      `Showing ${movies.length} of ${totalMovies} movies in your collection`
                  }
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  href="/add"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cinema-gold text-black rounded-lg hover:bg-cinema-gold/90 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Movie
                </Link>
              </div>
            </div>

            {/* Search and Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search movies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[300px]"
                />
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* View Mode Toggle */}
              <div className="flex border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background/50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background/50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {quickFilters.map((filter) => {
            const IconComponent = filter.icon;
            const isActive = selectedTag === filter.value;

            return (
              <motion.button
                key={filter.value}
                onClick={() => setSelectedTag(filter.value)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-card/50 text-foreground hover:bg-card/80 border border-border/50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <IconComponent className="w-4 h-4" />
                {filter.label}
              </motion.button>
            );
          })}
        </div>

        {/* Movie Grid */}
        <MovieGrid
          movies={movies}
          onMovieSelect={handleMovieSelect}
          loading={loading}
          columns={6}
        />

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
                You've reached the end of your collection
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