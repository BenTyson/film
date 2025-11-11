/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react/no-unescaped-entities, @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Loader2,
  Calendar,
  User,
  Star,
  ExternalLink,
  Check,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditOscarMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  oscarMovie: {
    id: number;
    title: string;
    tmdb_id: number | null;
    imdb_id: string | null;
    review_status?: string;
    verification_notes?: string | null;
    confidence_score?: number | null;
  };
  ceremonyYear?: number; // For auto-calculating search year
  onMovieUpdated: () => void;
  reviewMode?: boolean; // Enable review-specific features
}

export function EditOscarMovieModal({
  isOpen,
  onClose,
  oscarMovie,
  ceremonyYear,
  onMovieUpdated,
  reviewMode = false
}: EditOscarMovieModalProps) {
  // Auto-populate search with ceremony year context
  const defaultSearchYear = ceremonyYear ? ceremonyYear - 1 : null;
  const initialSearch = reviewMode && defaultSearchYear
    ? `${oscarMovie.title} year:${defaultSearchYear}`
    : '';

  const [tmdbSearchQuery, setTmdbSearchQuery] = useState(initialSearch);
  const [tmdbSearchResults, setTmdbSearchResults] = useState<any[]>([]);
  const [tmdbSearchLoading, setTmdbSearchLoading] = useState(false);
  const [updatingMovie, setUpdatingMovie] = useState<number | null>(null);

  // Auto-search on modal open in review mode
  useEffect(() => {
    if (isOpen && reviewMode && initialSearch) {
      searchTMDB(initialSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const searchTMDB = async (query: string) => {
    if (!query.trim()) {
      setTmdbSearchResults([]);
      return;
    }

    setTmdbSearchLoading(true);
    try {
      const response = await fetch('/api/tmdb/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          enhanced: true
        })
      });
      const data = await response.json();

      if (data.success) {
        setTmdbSearchResults(data.results || []);
      } else {
        console.error('TMDB search error:', data.error);
        setTmdbSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching TMDB:', error);
      setTmdbSearchResults([]);
    } finally {
      setTmdbSearchLoading(false);
    }
  };

  const handleUpdateOscarMovie = async (newTmdbId: number) => {
    setUpdatingMovie(newTmdbId);
    try {
      const response = await fetch(`/api/oscars/movies/${oscarMovie.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tmdb_id: newTmdbId,
          review_status: reviewMode ? 'manually_reviewed' : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        onMovieUpdated();
        onClose();
      } else {
        alert(`Failed to update Oscar movie: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating Oscar movie:', error);
      alert('Failed to update Oscar movie');
    } finally {
      setUpdatingMovie(null);
    }
  };

  const handleSkip = () => {
    // Close modal without making changes
    onClose();
  };

  const handleKeepOriginal = async () => {
    if (!oscarMovie.tmdb_id) return;

    setUpdatingMovie(oscarMovie.tmdb_id);
    try {
      const response = await fetch(`/api/oscars/movies/${oscarMovie.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tmdb_id: oscarMovie.tmdb_id,
          review_status: 'manually_reviewed',
          verification_notes: null
        })
      });

      const data = await response.json();

      if (data.success) {
        onMovieUpdated();
        onClose();
      } else {
        alert(`Failed to update Oscar movie: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating Oscar movie:', error);
      alert('Failed to update Oscar movie');
    } finally {
      setUpdatingMovie(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 rounded-2xl shadow-2xl border border-gray-800"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Award className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Edit Oscar Movie</h2>
                <p className="text-sm text-gray-400">Update TMDB match for: {oscarMovie.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Current Movie Info */}
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Current TMDB Match</h3>
              <div>
                <p className="text-white font-medium">{oscarMovie.title}</p>
                {oscarMovie.tmdb_id && (
                  <p className="text-sm text-gray-400">TMDB ID: {oscarMovie.tmdb_id}</p>
                )}
                {oscarMovie.imdb_id && (
                  <p className="text-sm text-gray-400">IMDB ID: {oscarMovie.imdb_id}</p>
                )}
                {!oscarMovie.tmdb_id && (
                  <p className="text-sm text-yellow-500 mt-1">⚠️ No TMDB match - please search and select the correct movie</p>
                )}
              </div>
            </div>

            {/* Review Context (only in review mode) */}
            {reviewMode && (
              <div className="space-y-3">
                {ceremonyYear && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-300">
                      <span className="font-medium">Ceremony:</span> {ceremonyYear} → <span className="font-medium">Expected Release:</span> {defaultSearchYear}
                    </p>
                  </div>
                )}

                {oscarMovie.verification_notes && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-sm font-medium text-yellow-400 mb-1">Verification Notes:</p>
                    <p className="text-sm text-yellow-200">{oscarMovie.verification_notes}</p>
                  </div>
                )}

                {oscarMovie.confidence_score !== null && oscarMovie.confidence_score !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Confidence:</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full", {
                          "bg-green-500": oscarMovie.confidence_score >= 0.9,
                          "bg-yellow-500": oscarMovie.confidence_score >= 0.7 && oscarMovie.confidence_score < 0.9,
                          "bg-red-500": oscarMovie.confidence_score < 0.7
                        })}
                        style={{ width: `${oscarMovie.confidence_score * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-300">{(oscarMovie.confidence_score * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Search Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400">Search for Correct Movie</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={tmdbSearchQuery}
                  onChange={(e) => {
                    setTmdbSearchQuery(e.target.value);
                    if (e.target.value.trim()) {
                      searchTMDB(e.target.value);
                    } else {
                      setTmdbSearchResults([]);
                    }
                  }}
                  placeholder="Search TMDB for the correct movie..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-white placeholder-gray-400"
                />
                {tmdbSearchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
              </div>

              {/* Search Results */}
              {tmdbSearchResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {tmdbSearchResults.map((result) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-all cursor-pointer group"
                      onClick={() => handleUpdateOscarMovie(result.id)}
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : '/placeholder-poster.svg'}
                          alt={result.title}
                          className="w-12 h-18 object-cover rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium truncate">{result.title}</h4>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                            {result.release_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(result.release_date).getFullYear()}
                              </span>
                            )}
                            {result.director && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {result.director}
                              </span>
                            )}
                            {result.vote_average > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {result.vote_average.toFixed(1)}
                              </span>
                            )}
                          </div>
                          {result.overview && (
                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{result.overview}</p>
                          )}
                        </div>
                        {updatingMovie === result.id ? (
                          <Loader2 className="w-5 h-5 text-yellow-400 animate-spin flex-shrink-0" />
                        ) : (
                          <Check className="w-5 h-5 text-gray-600 group-hover:text-yellow-400 transition-colors flex-shrink-0" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {!tmdbSearchLoading && tmdbSearchQuery && tmdbSearchResults.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>No results found for "{tmdbSearchQuery}"</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </div>

            {/* Review Action Buttons (only in review mode) */}
            {reviewMode && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Skip for Now
                </button>

                <div className="flex items-center gap-3">
                  {oscarMovie.tmdb_id && (
                    <button
                      onClick={handleKeepOriginal}
                      disabled={updatingMovie === oscarMovie.tmdb_id}
                      className="px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {updatingMovie === oscarMovie.tmdb_id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Keep Original
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
