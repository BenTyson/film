/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Calendar,
  Clock,
  Award,
  Edit3,
  Save,
  Heart,
  MapPin,
  Tag,
  Play,
  Info,
  Users,
  Film,
  Trophy,
  ExternalLink,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  Eye,
  TrendingUp,
  DollarSign,
  Globe,
  Clapperboard,
  Tv
} from 'lucide-react';
import { cn, formatDate, formatYear, getRatingColor } from '@/lib/utils';
import type { MovieWithDetails } from '@/types/movie';
import type { WatchProvidersData } from '@/lib/tmdb';

interface MovieDetailsModalProps {
  movieId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onMovieUpdate?: () => void;
}

interface MovieDetails extends MovieWithDetails {
  user_movies: Array<{
    id: number;
    movie_id: number;
    date_watched: Date;
    personal_rating: number | null;
    notes: string | null;
    is_favorite: boolean;
    watch_location: string | null;
    buddy_watched_with: string[] | null; // Array of buddy names
    created_at: Date;
    updated_at: Date;
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
  cast?: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
  }>;
  crew?: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }>;
  tagline?: string;
  vote_average?: number;
  popularity?: number;
  budget?: number;
  revenue?: number;
  original_language?: string;
  production_companies?: Array<{
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }>;
}

type TabType = 'overview' | 'details' | 'personal' | 'media' | 'streaming' | 'awards';

export function MovieDetailsModal({ movieId, isOpen, onClose, onMovieUpdate }: MovieDetailsModalProps) {
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Watch providers state
  const [watchProviders, setWatchProviders] = useState<WatchProvidersData | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Edit form state
  const [editData, setEditData] = useState({
    personal_rating: 0,
    notes: '',
    is_favorite: false,
    watch_location: '',
    date_watched: '',
    buddy_watched_with: [] as string[]
  });

  // Buddy input for adding new buddies
  const [buddyInput, setBuddyInput] = useState('');

  // Existing tags state
  const [movieTags, setMovieTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Array<{ id: number; name: string; color: string | null }>>([]);
  const [newTag, setNewTag] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const fetchMovieDetails = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/movies/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Invalid JSON response:', text);
        throw new Error('Invalid response format');
      }

      if (data.success) {
        setMovie(data.data);

        // Initialize edit data with current values
        const userMovie = data.data.user_movies[0];
        if (userMovie) {
          setEditData({
            personal_rating: userMovie.personal_rating || 0,
            notes: userMovie.notes || '',
            is_favorite: userMovie.is_favorite || false,
            watch_location: userMovie.watch_location || '',
            date_watched: userMovie.date_watched ? new Date(userMovie.date_watched).toISOString().split('T')[0] : '',
            buddy_watched_with: Array.isArray(userMovie.buddy_watched_with) ? userMovie.buddy_watched_with : []
          });
        }

        // Set current tags
        setMovieTags(data.data.movie_tags?.map((mt: any) => mt.tag.name) || []);
      } else {
        throw new Error(data.error || 'Failed to fetch movie details');
      }
    } catch (error) {
      console.error('Error fetching movie details:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/tags');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Invalid JSON response:', text);
        return;
      }

      if (data.success) {
        setAvailableTags(data.data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      // Set empty array as fallback
      setAvailableTags([]);
    }
  }, []);

  const fetchWatchProviders = useCallback(async (tmdbId: number) => {
    setLoadingProviders(true);
    try {
      const response = await fetch(`/api/tmdb/watch-providers/${tmdbId}`);
      const data = await response.json();

      if (data.success) {
        setWatchProviders(data.data);
      }
    } catch (error) {
      console.error('Error fetching watch providers:', error);
      setWatchProviders(null);
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  useEffect(() => {
    if (movieId && isOpen) {
      fetchMovieDetails(movieId);
      fetchTags();
      setActiveTab('overview');
      setIsEditing(false);
    }
  }, [movieId, isOpen, fetchMovieDetails, fetchTags]);

  // Fetch watch providers when movie data is loaded
  useEffect(() => {
    if (movie?.tmdb_id && isOpen) {
      fetchWatchProviders(movie.tmdb_id);
    }
  }, [movie?.tmdb_id, isOpen, fetchWatchProviders]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape' && !isEditing) {
        onClose();
      } else if (e.key === 'e' && !isEditing && e.target === document.body) {
        setIsEditing(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, onClose]);

  const handleAddBuddy = () => {
    const buddy = buddyInput.trim();
    if (buddy && !editData.buddy_watched_with.includes(buddy)) {
      setEditData(prev => ({
        ...prev,
        buddy_watched_with: [...prev.buddy_watched_with, buddy]
      }));
      setBuddyInput('');
    }
  };

  const handleRemoveBuddy = (buddyToRemove: string) => {
    setEditData(prev => ({
      ...prev,
      buddy_watched_with: prev.buddy_watched_with.filter(b => b !== buddyToRemove)
    }));
  };

  const handleSave = async () => {
    if (!movie || !movie.user_movies[0]) return;

    setIsSaving(true);
    try {
      // Save user movie data
      const response = await fetch(`/api/movies/${movie.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_movie_id: movie.user_movies[0].id,
          ...editData,
          date_watched: editData.date_watched ? new Date(editData.date_watched) : null
        })
      });

      if (response.ok) {
        // Update tags
        await updateTags();

        // Refresh movie details
        await fetchMovieDetails(movie.id);
        setIsEditing(false);

        // Trigger parent update if provided
        if (onMovieUpdate) {
          onMovieUpdate();
        }
      }
    } catch (error) {
      console.error('Error saving movie:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateTags = async () => {
    if (!movie) return;

    try {
      // Get current tags from the movie
      const currentTags = movie.movie_tags?.map(mt => mt.tag?.name).filter((name): name is string => Boolean(name)) || [];

      // Find tags to add and remove
      const tagsToAdd = movieTags.filter(tag => !currentTags.includes(tag));
      const tagsToRemove = currentTags.filter(tag => !movieTags.includes(tag));

      // Add new tags
      if (tagsToAdd.length > 0) {
        await fetch(`/api/movies/${movie.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: tagsToAdd })
        });
      }

      // Remove old tags
      if (tagsToRemove.length > 0) {
        await fetch(`/api/movies/${movie.id}/tags`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: tagsToRemove })
        });
      }
    } catch (error) {
      console.error('Error updating tags:', error);
    }
  };

  const handleAddTag = (tagName: string) => {
    if (!movieTags.includes(tagName)) {
      setMovieTags([...movieTags, tagName]);
    }
    setNewTag('');
    setShowTagDropdown(false);
  };

  const handleRemoveTag = (tagName: string) => {
    setMovieTags(movieTags.filter(t => t !== tagName));
  };

  const handleDelete = async () => {
    if (!movie) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/movies/${movie.id}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          removed_by: 'User',
          reason: 'Removed from collection'
        })
      });

      if (response.ok) {
        // Close modal and trigger parent update
        onClose();
        if (onMovieUpdate) {
          onMovieUpdate();
        }
      } else {
        console.error('Failed to delete movie');
      }
    } catch (error) {
      console.error('Error deleting movie:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (!isOpen) return null;

  const backdropUrl = movie?.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : null;

  const posterUrl = movie?.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-poster.svg';

  const userMovie = movie?.user_movies[0];
  const hasOscarWins = movie?.oscar_data?.filter(o => o.nomination_type === 'won').length || 0;
  const hasOscarNominations = movie?.oscar_data?.length || 0;

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Info },
    { id: 'details' as TabType, label: 'Details', icon: Film },
    { id: 'personal' as TabType, label: 'Personal', icon: Users },
    { id: 'media' as TabType, label: 'Media', icon: Play },
    { id: 'streaming' as TabType, label: 'Streaming', icon: Tv },
    ...(hasOscarNominations > 0 ? [{ id: 'awards' as TabType, label: 'Awards', icon: Trophy }] : [])
  ];

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
              {movie && (
                <div className="flex items-center gap-2">
                  {userMovie?.is_favorite && (
                    <Heart className="w-5 h-5 text-red-500 fill-current" />
                  )}
                  {hasOscarWins > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-full">
                      <Award className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-purple-400 font-bold">{hasOscarWins}</span>
                    </div>
                  )}
                </div>
              )}
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
                      title="Remove from Collection"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                  <button
                    onClick={() => isEditing ? handleSave() : setIsEditing(!isEditing)}
                    disabled={isSaving}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                      isEditing
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-white/10 hover:bg-white/20 text-white"
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

          {/* Tab Navigation */}
          {!loading && movie && (
            <div className="flex gap-1 px-4 lg:px-6 pb-2 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "text-white/60 hover:text-white/80 hover:bg-white/10"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="h-full overflow-y-auto pt-32 lg:pt-36 pb-8">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : movie ? (
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              {/* Hero Section with Backdrop */}
              {backdropUrl && (
                <motion.div
                  className="relative h-96 lg:h-[500px] -mx-4 lg:-mx-6 -mt-32 lg:-mt-36 mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Image
                    src={backdropUrl}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                  {/* Movie Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-6">
                    <div className="max-w-7xl mx-auto">
                      <div className="flex flex-col lg:flex-row gap-6">
                        <motion.div
                          className="flex-shrink-0"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Image
                            src={posterUrl}
                            alt={movie.title}
                            width={200}
                            height={300}
                            className="rounded-lg shadow-2xl"
                          />
                        </motion.div>

                        <div className="flex-1 flex flex-col justify-end">
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <div className="flex flex-wrap items-center gap-3 mb-3 text-white/80">
                              <span className="text-lg">{formatYear(movie.release_date)}</span>
                              {movie.runtime && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{movie.runtime} min</span>
                                  </div>
                                </>
                              )}
                              {userMovie?.personal_rating && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 fill-purple-400 text-purple-400" />
                                    <span className="font-bold">{userMovie.personal_rating}/10</span>
                                  </div>
                                </>
                              )}
                            </div>

                            {movie.genres && Array.isArray(movie.genres) && (
                              <div className="flex flex-wrap gap-2">
                                {movie.genres.map((genre: any) => (
                                  <span
                                    key={genre.id}
                                    className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white"
                                  >
                                    {genre.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                          <h2 className="text-xl font-bold text-white mb-4">Synopsis</h2>
                          <p className="text-white/80 leading-relaxed">
                            {movie.overview || 'No overview available.'}
                          </p>

                          {movie.tagline && (
                            <blockquote className="mt-4 pt-4 border-t border-white/10 text-white/60 italic">
                              "{movie.tagline}"
                            </blockquote>
                          )}
                        </div>

                        {movie.director && (
                          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-2">Director</h3>
                            <p className="text-white/80">{movie.director}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                          <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
                          <div className="space-y-3">
                            {movie.vote_average && (
                              <div className="flex justify-between">
                                <span className="text-white/60">TMDB Rating</span>
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 fill-purple-400 text-purple-400" />
                                  <span className="text-white font-medium">{movie.vote_average.toFixed(1)}</span>
                                </div>
                              </div>
                            )}
                            {movie.popularity && (
                              <div className="flex justify-between">
                                <span className="text-white/60">Popularity</span>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-4 h-4 text-green-500" />
                                  <span className="text-white font-medium">{Math.round(movie.popularity)}</span>
                                </div>
                              </div>
                            )}
                            {userMovie && (
                              <div className="flex justify-between">
                                <span className="text-white/60">Watched</span>
                                <span className="text-white font-medium">
                                  {formatDate(userMovie.date_watched)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                          <h3 className="text-lg font-bold text-white mb-4">External Links</h3>
                          <div className="space-y-2">
                            {movie.imdb_id && (
                              <a
                                href={`https://www.imdb.com/title/${movie.imdb_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <span className="text-white/80">IMDb</span>
                                <ExternalLink className="w-4 h-4 text-white/60" />
                              </a>
                            )}
                            <a
                              href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <span className="text-white/80">TMDB</span>
                              <ExternalLink className="w-4 h-4 text-white/60" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'details' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Production Details</h2>
                        <div className="space-y-3">
                          {movie.budget && movie.budget > 0 && (
                            <div className="flex justify-between">
                              <span className="text-white/60">Budget</span>
                              <span className="text-white font-medium">{formatCurrency(movie.budget)}</span>
                            </div>
                          )}
                          {movie.revenue && movie.revenue > 0 && (
                            <div className="flex justify-between">
                              <span className="text-white/60">Box Office</span>
                              <span className="text-white font-medium">{formatCurrency(movie.revenue)}</span>
                            </div>
                          )}
                          {movie.original_language && (
                            <div className="flex justify-between">
                              <span className="text-white/60">Language</span>
                              <span className="text-white font-medium uppercase">{movie.original_language}</span>
                            </div>
                          )}
                          {movie.production_companies && movie.production_companies.length > 0 && (
                            <div>
                              <span className="text-white/60 block mb-2">Production Companies</span>
                              <div className="space-y-1">
                                {movie.production_companies.slice(0, 3).map((company: any) => (
                                  <div key={company.id} className="text-white text-sm">
                                    {company.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Cast & Crew</h2>
                        <div className="space-y-4">
                          {movie.cast && movie.cast.slice(0, 5).map((actor) => (
                            <div key={actor.id} className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs">
                                {actor.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div className="flex-1">
                                <div className="text-white text-sm font-medium">{actor.name}</div>
                                <div className="text-white/60 text-xs">{actor.character}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'personal' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">My Data</h2>
                        <div className="space-y-4">
                          {/* Watch Date */}
                          <div>
                            <label className="flex items-center gap-2 text-white/60 text-sm mb-2">
                              <Calendar className="w-4 h-4" />
                              Watch Date
                            </label>
                            {isEditing ? (
                              <input
                                type="date"
                                value={editData.date_watched}
                                onChange={(e) => setEditData(prev => ({ ...prev, date_watched: e.target.value }))}
                                className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                              />
                            ) : (
                              <p className="text-white">
                                {userMovie?.date_watched ? formatDate(userMovie.date_watched) : 'Not set'}
                              </p>
                            )}
                          </div>

                          {/* Rating */}
                          <div>
                            <label className="flex items-center gap-2 text-white/60 text-sm mb-2">
                              <Star className="w-4 h-4" />
                              My Rating
                            </label>
                            {isEditing ? (
                              <div className="flex gap-1">
                                {[...Array(10)].map((_, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setEditData(prev => ({ ...prev, personal_rating: i + 1 }))}
                                    className={cn(
                                      "p-1 transition-colors",
                                      i < editData.personal_rating ? "text-purple-400" : "text-white/20"
                                    )}
                                  >
                                    <Star className="w-6 h-6 fill-current" />
                                  </button>
                                ))}
                                {editData.personal_rating > 0 && (
                                  <button
                                    onClick={() => setEditData(prev => ({ ...prev, personal_rating: 0 }))}
                                    className="ml-2 px-2 py-1 text-xs text-white/60 hover:text-white"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {userMovie?.personal_rating ? (
                                  <>
                                    <div className="flex gap-1">
                                      {[...Array(10)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={cn(
                                            "w-5 h-5",
                                            i < (userMovie.personal_rating || 0)
                                              ? "fill-purple-400 text-purple-400"
                                              : "text-white/20"
                                          )}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-white font-medium">{userMovie.personal_rating}/10</span>
                                  </>
                                ) : (
                                  <span className="text-white/60">No rating</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Watch Location */}
                          <div>
                            <label className="flex items-center gap-2 text-white/60 text-sm mb-2">
                              <MapPin className="w-4 h-4" />
                              Watch Location
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editData.watch_location}
                                onChange={(e) => setEditData(prev => ({ ...prev, watch_location: e.target.value }))}
                                placeholder="Theater, Home, etc."
                                className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                              />
                            ) : (
                              <p className="text-white">
                                {userMovie?.watch_location || 'Not specified'}
                              </p>
                            )}
                          </div>

                          {/* Watched With */}
                          <div>
                            <label className="flex items-center gap-2 text-white/60 text-sm mb-2">
                              <Users className="w-4 h-4" />
                              Watched With
                            </label>
                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={buddyInput}
                                    onChange={(e) => setBuddyInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddBuddy()}
                                    placeholder="Add person's name..."
                                    className="flex-1 px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                                  />
                                  <button
                                    onClick={handleAddBuddy}
                                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40 rounded-lg transition-colors"
                                  >
                                    Add
                                  </button>
                                </div>
                                {editData.buddy_watched_with.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {editData.buddy_watched_with.map((buddy) => (
                                      <span
                                        key={buddy}
                                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-2 border border-green-500/40"
                                      >
                                        {buddy}
                                        <button
                                          onClick={() => handleRemoveBuddy(buddy)}
                                          className="hover:text-red-400 transition-colors"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-white">
                                {Array.isArray(userMovie?.buddy_watched_with) && userMovie.buddy_watched_with.length > 0
                                  ? userMovie.buddy_watched_with.join(', ')
                                  : 'Solo'}
                              </p>
                            )}
                          </div>

                          {/* Favorite */}
                          <div>
                            <label className="flex items-center gap-2 text-white/60 text-sm mb-2">
                              <Heart className="w-4 h-4" />
                              Favorite
                            </label>
                            {isEditing ? (
                              <button
                                onClick={() => setEditData(prev => ({ ...prev, is_favorite: !prev.is_favorite }))}
                                className={cn(
                                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                                  editData.is_favorite
                                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                    : "bg-white/10 text-white/60 border border-white/20"
                                )}
                              >
                                <Heart className={cn(
                                  "w-5 h-5",
                                  editData.is_favorite && "fill-current"
                                )} />
                                {editData.is_favorite ? 'Favorited' : 'Add to Favorites'}
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Heart className={cn(
                                  "w-5 h-5",
                                  userMovie?.is_favorite ? "fill-red-500 text-red-500" : "text-white/20"
                                )} />
                                <span className="text-white">
                                  {userMovie?.is_favorite ? 'Favorited' : 'Not favorited'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Tags */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                          <h3 className="text-lg font-bold text-white mb-4">Tags</h3>
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {movieTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 text-white rounded-full text-sm"
                                  >
                                    {tag}
                                    <button
                                      onClick={() => handleRemoveTag(tag)}
                                      className="ml-1 hover:text-red-400"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={newTag}
                                  onChange={(e) => setNewTag(e.target.value)}
                                  onFocus={() => setShowTagDropdown(true)}
                                  onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
                                  placeholder="Add tag..."
                                  className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                                />
                                {showTagDropdown && (
                                  <div className="absolute top-full mt-1 w-full bg-black/90 border border-white/20 rounded-lg max-h-40 overflow-y-auto">
                                    {availableTags
                                      .filter(tag =>
                                        tag.name.toLowerCase().includes(newTag.toLowerCase()) &&
                                        !movieTags.includes(tag.name)
                                      )
                                      .map(tag => (
                                        <button
                                          key={tag.id}
                                          onClick={() => handleAddTag(tag.name)}
                                          className="w-full px-3 py-2 text-left text-white hover:bg-white/10 transition-colors"
                                        >
                                          {tag.name}
                                        </button>
                                      ))}
                                    {newTag && !availableTags.some(t => t.name.toLowerCase() === newTag.toLowerCase()) && (
                                      <button
                                        onClick={() => handleAddTag(newTag)}
                                        className="w-full px-3 py-2 text-left text-white hover:bg-white/10 transition-colors"
                                      >
                                        <Plus className="inline w-4 h-4 mr-2" />
                                        Create "{newTag}"
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {movie.movie_tags?.map((movieTag) => (
                                <span
                                  key={movieTag.id}
                                  className="px-3 py-1 rounded-full text-sm"
                                  style={{
                                    backgroundColor: movieTag.tag?.color ? `${movieTag.tag.color}30` : 'rgba(255,255,255,0.1)',
                                    color: movieTag.tag?.color || 'white'
                                  }}
                                >
                                  {movieTag.tag?.name}
                                </span>
                              )) || <span className="text-white/60">No tags</span>}
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                          <h3 className="text-lg font-bold text-white mb-4">Notes</h3>
                          {isEditing ? (
                            <textarea
                              value={editData.notes}
                              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder="Add your thoughts..."
                              rows={6}
                              className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
                            />
                          ) : (
                            <p className="text-white/80 whitespace-pre-wrap">
                              {userMovie?.notes || <span className="text-white/40">No notes yet</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'media' && (
                    <div className="space-y-8">
                      {movie.trailer && (
                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                          <h2 className="text-xl font-bold text-white mb-4">Trailer</h2>
                          <div className="aspect-video rounded-lg overflow-hidden bg-black">
                            <iframe
                              src={movie.trailer.embed_url}
                              title={movie.trailer.name}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      )}

                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Posters & Images</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="aspect-[2/3] relative rounded-lg overflow-hidden">
                            <Image
                              src={posterUrl}
                              alt={movie.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'streaming' && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Tv className="w-6 h-6 text-blue-400" />
                        Where to Watch
                      </h2>

                      {loadingProviders ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                      ) : watchProviders && watchProviders.providers.length > 0 ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {watchProviders.providers.map((provider) => (
                              <div
                                key={provider.provider_id}
                                className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white">
                                  <Image
                                    src={provider.logo_url}
                                    alt={provider.provider_name}
                                    width={64}
                                    height={64}
                                    className="object-cover"
                                  />
                                </div>
                                <span className="text-sm text-white text-center font-medium">
                                  {provider.provider_name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Tv className="w-12 h-12 text-white/20 mx-auto mb-3" />
                          <p className="text-white/60">
                            No streaming platforms available for this movie in the US.
                          </p>
                          <p className="text-sm text-white/40 mt-2">
                            Check back later or explore other regions on TMDB.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'awards' && hasOscarNominations > 0 && (
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-purple-400" />
                        Academy Awards
                      </h2>
                      <div className="space-y-3">
                        {movie.oscar_data.map((oscar) => (
                          <div
                            key={oscar.id}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-lg border",
                              oscar.nomination_type === 'won'
                                ? "bg-purple-500/10 border-purple-500/30"
                                : "bg-white/5 border-white/10"
                            )}
                          >
                            <div>
                              <div className="text-white font-medium">{oscar.category}</div>
                              {oscar.nominee_name && (
                                <div className="text-white/60 text-sm mt-1">{oscar.nominee_name}</div>
                              )}
                              <div className="text-white/40 text-xs mt-1">{oscar.ceremony_year}</div>
                            </div>
                            <div className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold uppercase",
                              oscar.nomination_type === 'won'
                                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                                : "bg-white/20 text-white"
                            )}>
                              {oscar.nomination_type}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-white/60">Movie not found</p>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-md mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Remove Movie</h3>
                  <p className="text-white/60 text-sm">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-white/80 mb-6">
                Are you sure you want to remove <strong>"{movie?.title}"</strong> from your collection?
                This will mark it as removed but preserve your personal data.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      Removing...
                    </div>
                  ) : (
                    'Remove Movie'
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