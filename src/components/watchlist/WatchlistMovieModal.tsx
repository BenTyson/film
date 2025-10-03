/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Calendar,
  Clock,
  Tag,
  Play,
  Info,
  Film,
  ExternalLink,
  Trash2,
  Edit3,
  Save,
  Plus,
  Check,
} from 'lucide-react';
import { cn, formatDate, formatYear } from '@/lib/utils';

interface WatchlistMovieModalProps {
  movieId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onMovieUpdate?: () => void;
}

interface WatchlistMovie {
  id: number;
  tmdb_id: number;
  title: string;
  director: string | null;
  release_date: Date | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  runtime: number | null;
  genres: any;
  vote_average: number | null;
  imdb_id: string | null;
  tags: Array<{
    id: number;
    tag: {
      id: number;
      name: string;
      color: string | null;
      icon: string | null;
    };
  }>;
  trailer?: {
    key: string;
    name: string;
    type: string;
    site: string;
    official: boolean;
    youtube_url: string;
    embed_url: string;
    thumbnail_url: string;
  } | null;
}

type TabType = 'overview' | 'details';

export function WatchlistMovieModal({ movieId, isOpen, onClose, onMovieUpdate }: WatchlistMovieModalProps) {
  const [movie, setMovie] = useState<WatchlistMovie | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tags state
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [availableTags, setAvailableTags] = useState<Array<{ id: number; name: string; color: string | null; icon: string | null }>>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const fetchMovieDetails = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/watchlist/${id}`);
      const data = await response.json();

      if (data.success) {
        setMovie(data.data);
        setSelectedTags(data.data.tags?.map((t: any) => t.tag.id) || []);

        // Fetch trailer from TMDB if we have tmdb_id
        if (data.data.tmdb_id) {
          const trailerResponse = await fetch(`/api/tmdb/trailer/${data.data.tmdb_id}`);
          const trailerData = await trailerResponse.json();
          if (trailerData.success && trailerData.data) {
            setMovie((prev) => prev ? { ...prev, trailer: trailerData.data } : null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching watchlist movie:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      if (data.success) {
        // Filter to only show watchlist mood tags
        const watchlistTags = data.data.filter((tag: any) =>
          ['Morgan', 'Liam', 'Epic', 'Scary', 'Indie'].includes(tag.name)
        );
        setAvailableTags(watchlistTags);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      setAvailableTags([]);
    }
  }, []);

  useEffect(() => {
    if (movieId && isOpen) {
      fetchMovieDetails(movieId);
      fetchTags();
      setActiveTab('overview');
      setIsEditing(false);
      setShowTrailer(false);
    }
  }, [movieId, isOpen, fetchMovieDetails, fetchTags]);

  const handleSave = async () => {
    if (!movie) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/watchlist/${movie.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tag_ids: selectedTags,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMovie(data.data);
        setIsEditing(false);
        onMovieUpdate?.();
      } else {
        alert(`Failed to update movie: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating movie:', error);
      alert('Failed to update movie');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!movie) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/watchlist/${movie.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        onMovieUpdate?.();
        onClose();
      } else {
        alert(`Failed to delete movie: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting movie:', error);
      alert('Failed to delete movie');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  if (!isOpen) return null;

  const genres = movie?.genres ? (Array.isArray(movie.genres) ? movie.genres : []) : [];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/95"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-60 bg-gradient-to-b from-black via-black/90 to-transparent">
          <div className="flex items-center justify-between p-4 lg:p-6">
            <div className="flex items-center gap-4">
              <motion.h1
                className="text-2xl lg:text-3xl font-bold text-white"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {movie?.title || 'Loading...'}
              </motion.h1>
            </div>

            <div className="flex items-center gap-2">
              {!loading && movie && (
                <>
                  {movie.trailer && (
                    <button
                      onClick={() => setShowTrailer(!showTrailer)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      title="Watch Trailer"
                    >
                      <Play className="w-5 h-5 text-white" />
                    </button>
                  )}
                  {isEditing && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      title="Remove from Watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                  <button
                    onClick={() => (isEditing ? handleSave() : setIsEditing(!isEditing))}
                    disabled={isSaving}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                      isEditing
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    )}
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    ) : isEditing ? (
                      <>
                        <Save className="w-4 h-4" />
                        <span className="hidden sm:inline">Save</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4" />
                        <span className="hidden sm:inline">Edit</span>
                      </>
                    )}
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          {!loading && movie && (
            <div className="px-4 lg:px-6 pb-2">
              <div className="flex gap-4 border-b border-white/10">
                {(['overview', 'details'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-4 py-2 text-sm font-medium capitalize transition-all',
                      activeTab === tab
                        ? 'text-white border-b-2 border-blue-500'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto pt-32 pb-20">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : movie ? (
            <div className="max-w-6xl mx-auto px-4 lg:px-6 space-y-6">
              {/* Backdrop/Poster */}
              {movie.backdrop_path && !showTrailer && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                  <Image
                    src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                </div>
              )}

              {/* Trailer */}
              {showTrailer && movie.trailer && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe
                    src={movie.trailer.embed_url}
                    title={movie.trailer.name}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Content Tabs */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="flex flex-wrap items-center gap-4 text-gray-300">
                    {movie.release_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatYear(movie.release_date)}</span>
                      </div>
                    )}
                    {movie.runtime && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{movie.runtime} min</span>
                      </div>
                    )}
                    {movie.vote_average && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span>{movie.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Genres */}
                  {genres.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {genres.map((genre: any) => (
                        <span
                          key={genre.id}
                          className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Overview */}
                  {movie.overview && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-3">Overview</h3>
                      <p className="text-gray-300 leading-relaxed">{movie.overview}</p>
                    </div>
                  )}

                  {/* Tags Section */}
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">Mood Tags</h3>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            className={cn(
                              'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                              selectedTags.includes(tag.id)
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            )}
                          >
                            {tag.icon && <span className="mr-1">{tag.icon}</span>}
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {movie.tags && movie.tags.length > 0 ? (
                          movie.tags.map((movieTag) => (
                            <span
                              key={movieTag.id}
                              className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium"
                            >
                              {movieTag.tag.icon && <span className="mr-1">{movieTag.tag.icon}</span>}
                              {movieTag.tag.name}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-400 text-sm">No tags added</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {movie.director && (
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-sm text-gray-400 mb-1">Director</p>
                        <p className="text-white font-medium">{movie.director}</p>
                      </div>
                    )}
                    {movie.imdb_id && (
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-sm text-gray-400 mb-1">IMDb</p>
                        <a
                          href={`https://www.imdb.com/title/${movie.imdb_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          View on IMDb <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800"
            >
              <h3 className="text-xl font-bold text-white mb-2">Remove from Watchlist?</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to remove &quot;{movie?.title}&quot; from your watchlist?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
