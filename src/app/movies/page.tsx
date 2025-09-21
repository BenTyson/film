'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Grid, List, Star, Calendar, Award, Users, Plus, AlertTriangle, Grid3X3, LayoutGrid, Grip } from 'lucide-react';
import Link from 'next/link';
import { MovieGrid } from '@/components/movie/MovieGrid';
import { MovieList } from '@/components/movie/MovieList';
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
  const [sortBy, setSortBy] = useState('date_watched');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridColumns, setGridColumns] = useState<4 | 5 | 6>(6);
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
  }, [debouncedSearchQuery, sortBy]);

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


  const sortOptions = [
    { label: 'Date Watched', value: 'date_watched' },
    { label: 'Title', value: 'title' },
    { label: 'Release Date', value: 'release_date' },
    { label: 'Personal Rating', value: 'personal_rating' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cinema-black via-cinema-dark to-cinema-gray">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all text-white placeholder-gray-400"
              />
            </div>

            <div className="flex gap-3 items-center">
              {/* Movie Count */}
              <span className="text-gray-400 text-sm font-medium px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                {loading ? 'Loading...' :
                  searchQuery ?
                    `${movies.length} of ${totalMovies} found` :
                    `${movies.length} of ${totalMovies} movies`
                }
              </span>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-medium text-white min-w-[140px]"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-gray-800 text-white">
                    {option.label}
                  </option>
                ))}
              </select>

              {/* View Mode Toggle */}
              <div className="flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 transition-all ${viewMode === 'grid' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 transition-all ${viewMode === 'list' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              {/* Grid Density Toggle - Only show when in grid mode */}
              {viewMode === 'grid' && (
                <div className="hidden md:flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                  <button
                    onClick={() => setGridColumns(4)}
                    className={`p-3 transition-all ${gridColumns === 4 ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                    title="4 columns"
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setGridColumns(5)}
                    className={`p-3 transition-all ${gridColumns === 5 ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                    title="5 columns"
                  >
                    <Grid3X3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setGridColumns(6)}
                    className={`p-3 transition-all ${gridColumns === 6 ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                    title="6 columns"
                  >
                    <Grip className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
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