'use client';

import { useState, useEffect } from 'react';
import { Search, X, Plus, Check, Loader2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { formatYear } from '@/lib/utils';
import type { MovieGridItem } from '@/types/movie';

interface AddToCalenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

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

interface TagResponse {
  success: boolean;
  data?: {
    movieId: number;
    movieTitle: string;
    addedTags: Array<{
      id: number;
      name: string;
      color: string;
      icon: string;
    }>;
    message: string;
  };
  error?: string;
}

export function AddToCalenModal({ isOpen, onClose, onSuccess }: AddToCalenModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [movies, setMovies] = useState<MovieGridItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingMovieIds, setAddingMovieIds] = useState<Set<number>>(new Set());
  const [addedMovieIds, setAddedMovieIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Search movies when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery.trim().length >= 2) {
      searchMovies();
    } else {
      setMovies([]);
      setHasSearched(false);
    }
  }, [debouncedSearchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setMovies([]);
      setAddingMovieIds(new Set());
      setAddedMovieIds(new Set());
      setError(null);
      setHasSearched(false);
    }
  }, [isOpen]);

  const searchMovies = async () => {
    if (!debouncedSearchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        search: debouncedSearchQuery,
        limit: '20',
        page: '1'
      });

      const response = await fetch(`/api/movies?${params}`);
      const data: MoviesResponse = await response.json();

      if (data.success && data.data) {
        // Filter out movies that already have the Calen tag
        const filteredMovies = data.data.movies.filter(movie =>
          !movie.tags.some(tag => tag.name.toLowerCase() === 'calen')
        );
        setMovies(filteredMovies);
      } else {
        setError('Failed to search movies');
      }
    } catch (err) {
      setError('Error searching movies');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCalenTag = async (movie: MovieGridItem) => {
    setAddingMovieIds(prev => new Set(prev).add(movie.id));
    setError(null);

    try {
      const response = await fetch(`/api/movies/${movie.id}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: ['Calen']
        }),
      });

      const data: TagResponse = await response.json();

      if (data.success && data.data) {
        setAddedMovieIds(prev => new Set(prev).add(movie.id));
        // Remove movie from search results since it now has the Calen tag
        setMovies(prev => prev.filter(m => m.id !== movie.id));

        // Call success callback to refresh parent component
        onSuccess();
      } else {
        setError(`Failed to add "${movie.title}" to Calen: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Error adding "${movie.title}" to Calen`);
      console.error('Add to Calen error:', err);
    } finally {
      setAddingMovieIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(movie.id);
        return newSet;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Add Movies to Calen</h2>
                <p className="text-sm text-gray-400">Search your collection and add movies to the Calen tag</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search your movie collection..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-white placeholder-gray-400"
                autoFocus
              />
            </div>
            {error && (
              <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                <span className="ml-2 text-gray-400">Searching movies...</span>
              </div>
            )}

            {!loading && hasSearched && searchQuery.length >= 2 && movies.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No movies found</h3>
                <p className="text-gray-400">
                  No movies in your collection match &quot;{searchQuery}&quot; or all matching movies are already tagged with Calen.
                </p>
              </div>
            )}

            {!hasSearched && !loading && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Search to get started</h3>
                <p className="text-gray-400">
                  Type at least 2 characters to search your movie collection.
                </p>
              </div>
            )}

            {/* Movie Results Grid */}
            {movies.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {movies.map((movie) => (
                  <motion.div
                    key={movie.id}
                    className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-all"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    {/* Movie Poster */}
                    <div className="relative aspect-[2/3] bg-gray-700">
                      {movie.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                          alt={movie.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          No Poster
                        </div>
                      )}
                    </div>

                    {/* Movie Info */}
                    <div className="p-4">
                      <h3 className="font-medium text-white text-sm mb-1 line-clamp-2">
                        {movie.title}
                      </h3>
                      <p className="text-xs text-gray-400 mb-3">
                        {formatYear(movie.release_date)}{movie.director ? ` · ${movie.director}` : ''}
                      </p>

                      {/* Add Button */}
                      <button
                        onClick={() => addToCalenTag(movie)}
                        disabled={addingMovieIds.has(movie.id) || addedMovieIds.has(movie.id)}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                          addedMovieIds.has(movie.id)
                            ? 'bg-green-600 text-white cursor-default'
                            : addingMovieIds.has(movie.id)
                            ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                        }`}
                      >
                        {addingMovieIds.has(movie.id) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Adding...
                          </>
                        ) : addedMovieIds.has(movie.id) ? (
                          <>
                            <Check className="w-4 h-4" />
                            Added to Calen
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Add to Calen
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {movies.length > 0 ? `${movies.length} movies available to add` : ''}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}