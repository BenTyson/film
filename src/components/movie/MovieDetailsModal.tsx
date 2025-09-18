'use client';

import { useState, useEffect } from 'react';
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
  Eye,
  EyeOff,
  Play,
  Search,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn, formatDate, formatYear, getRatingColor } from '@/lib/utils';
import { TrailerPlayer } from './TrailerPlayer';
import type { MovieWithDetails } from '@/types/movie';

interface MovieDetailsModalProps {
  movieId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

interface MovieDetails extends MovieWithDetails {
  user_movies: Array<{
    id: number;
    date_watched: Date;
    personal_rating: number | null;
    notes: string | null;
    is_favorite: boolean;
    watch_location: string | null;
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
    all_trailers?: Array<{
      key: string;
      name: string;
      type: string;
      official: boolean;
      youtube_url: string;
      embed_url: string;
    }>;
  } | null;
}

export function MovieDetailsModal({ movieId, isOpen, onClose }: MovieDetailsModalProps) {
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingTMDB, setEditingTMDB] = useState(false);
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbSearchResults, setTmdbSearchResults] = useState<any[]>([]);
  const [tmdbSearchLoading, setTmdbSearchLoading] = useState(false);
  const [matchQuality, setMatchQuality] = useState<any>(null);
  const [editData, setEditData] = useState({
    personal_rating: 0,
    notes: '',
    is_favorite: false,
    watch_location: '',
  });

  const fetchMovieDetails = async (id: number) => {
    setLoading(true);
    try {
      const [movieResponse, qualityResponse] = await Promise.all([
        fetch(`/api/movies/${id}`),
        fetch(`/api/movies/match-quality?threshold=100`)
      ]);

      const movieData = await movieResponse.json();
      if (movieData.success) {
        setMovie(movieData.data);
        const userMovie = movieData.data.user_movies[0];
        if (userMovie) {
          setEditData({
            personal_rating: userMovie.personal_rating || 0,
            notes: userMovie.notes || '',
            is_favorite: userMovie.is_favorite || false,
            watch_location: userMovie.watch_location || '',
          });
        }

        // Find match quality for this specific movie
        const qualityData = await qualityResponse.json();
        if (qualityData.success) {
          const movieQuality = qualityData.data.assessments.find(
            (assessment: any) => assessment.movieId === id
          );
          setMatchQuality(movieQuality || null);
        }
      }
    } catch (error) {
      console.error('Error fetching movie details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (movieId && isOpen) {
      fetchMovieDetails(movieId);
    }
  }, [movieId, isOpen]);

  const handleSave = async () => {
    if (!movie || !movie.user_movies[0]) return;

    try {
      const response = await fetch(`/api/movies/${movie.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_movie_id: movie.user_movies[0].id,
          ...editData,
        }),
      });

      if (response.ok) {
        await fetchMovieDetails(movie.id);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error updating movie:', error);
    }
  };

  const searchTMDB = async (query: string) => {
    if (!query.trim()) {
      setTmdbSearchResults([]);
      return;
    }

    setTmdbSearchLoading(true);
    try {
      const response = await fetch('/api/tmdb/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, enhanced: true }),
      });

      const data = await response.json();
      if (data.success) {
        setTmdbSearchResults(data.results.slice(0, 10)); // Limit to 10 results
      }
    } catch (error) {
      console.error('Error searching TMDB:', error);
    } finally {
      setTmdbSearchLoading(false);
    }
  };

  const handleTMDBAssociationUpdate = async (newTmdbId: number) => {
    if (!movie) return;

    try {
      const response = await fetch(`/api/movies/${movie.id}/update-tmdb`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: newTmdbId }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchMovieDetails(movie.id);
        setEditingTMDB(false);
        setTmdbSearchQuery('');
        setTmdbSearchResults([]);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating TMDB association:', error);
      alert('Failed to update movie association');
    }
  };

  const backdropUrl = movie?.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : null;

  const posterUrl = movie?.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-poster.svg';

  const userMovie = movie?.user_movies[0];
  const hasOscarWins = movie?.oscar_data.filter(o => o.nomination_type === 'won').length || 0;
  const hasOscarNominations = movie?.oscar_data.length || 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="movie-details-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-4xl max-h-[90vh] bg-card rounded-xl overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : movie ? (
            <>
              {/* Header with Backdrop */}
              <div className="relative h-80 overflow-hidden">
                {backdropUrl && (
                  <Image
                    src={backdropUrl}
                    alt={movie.title}
                    fill
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors z-10"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Movie Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex gap-6">
                    {/* Poster */}
                    <div className="flex-shrink-0">
                      <Image
                        src={posterUrl}
                        alt={movie.title}
                        width={150}
                        height={225}
                        className="rounded-lg shadow-lg"
                      />
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 text-white">
                      <h1 className="text-3xl font-bold mb-2">{movie.title}</h1>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4 text-gray-300">
                          <span>{formatYear(movie.release_date)}</span>
                          {movie.runtime && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{movie.runtime} min</span>
                              </div>
                            </>
                          )}
                          {movie.director && (
                            <>
                              <span>•</span>
                              <span>{movie.director}</span>
                            </>
                          )}
                        </div>

                        {/* TMDB Edit Button */}
                        <button
                          onClick={() => {
                            setEditingTMDB(true);
                            // Pre-populate search with CSV data if available
                            if (movie.csv_title) {
                              const searchTerm = movie.csv_director
                                ? `${movie.csv_title} ${movie.csv_director}`
                                : movie.csv_title;
                              setTmdbSearchQuery(searchTerm);
                              searchTMDB(searchTerm);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-1 px-3 py-1 text-white rounded-lg text-sm transition-colors backdrop-blur-sm",
                            matchQuality && matchQuality.severity !== 'low'
                              ? "bg-red-600/80 hover:bg-red-600"
                              : "bg-orange-600/80 hover:bg-orange-600"
                          )}
                          title="Change TMDB association"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          {matchQuality && matchQuality.severity === 'high' ? 'Fix Movie!' : 'Fix Movie'}
                        </button>
                      </div>

                      {/* Genres */}
                      {movie.genres && Array.isArray(movie.genres) && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {movie.genres.slice(0, 3).map((genre: any) => (
                            <span
                              key={genre.id}
                              className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm"
                            >
                              {genre.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Oscar Badges */}
                      {(hasOscarWins > 0 || hasOscarNominations > 0) && (
                        <div className="flex gap-2 mb-3">
                          {hasOscarWins > 0 && (
                            <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500 text-black rounded-full text-sm font-bold">
                              <Award className="w-4 h-4" />
                              {hasOscarWins} Win{hasOscarWins > 1 ? 's' : ''}
                            </div>
                          )}
                          {hasOscarNominations > hasOscarWins && (
                            <div className="flex items-center gap-1 px-3 py-1 bg-gray-400 text-black rounded-full text-sm font-bold">
                              <Award className="w-4 h-4" />
                              {hasOscarNominations - hasOscarWins} Nomination{hasOscarNominations - hasOscarWins > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trailer Section */}
              {movie.trailer && (
                <div className="px-6 py-4 border-t border-border/50">
                  <TrailerPlayer
                    trailer={movie.trailer}
                    autoPlay={false}
                    className="max-w-lg"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Movie Details */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Overview */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Overview</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {movie.overview || 'No overview available.'}
                      </p>
                    </div>

                    {/* Oscar Details */}
                    {movie.oscar_data.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <Award className="w-5 h-5 text-yellow-500" />
                          Academy Awards
                        </h3>
                        <div className="space-y-2">
                          {movie.oscar_data.map((oscar) => (
                            <div
                              key={oscar.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg",
                                oscar.nomination_type === 'won'
                                  ? "bg-yellow-500/10 border border-yellow-500/20"
                                  : "bg-gray-500/10 border border-gray-500/20"
                              )}
                            >
                              <div>
                                <span className="font-medium">{oscar.category}</span>
                                {oscar.nominee_name && (
                                  <span className="text-muted-foreground"> • {oscar.nominee_name}</span>
                                )}
                              </div>
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-bold",
                                oscar.nomination_type === 'won'
                                  ? "bg-yellow-500 text-black"
                                  : "bg-gray-400 text-black"
                              )}>
                                {oscar.nomination_type === 'won' ? 'WON' : 'NOMINATED'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Personal Data */}
                  <div className="space-y-6">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">My Rating & Notes</h3>
                        <button
                          onClick={() => editing ? handleSave() : setEditing(true)}
                          className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
                        >
                          {editing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                          {editing ? 'Save' : 'Edit'}
                        </button>
                      </div>

                      {userMovie && (
                        <div className="space-y-4">
                          {/* Watch Date */}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              Watched {formatDate(userMovie.date_watched)}
                            </span>
                          </div>

                          {/* Location */}
                          {(editing || userMovie.watch_location) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              {editing ? (
                                <input
                                  type="text"
                                  value={editData.watch_location}
                                  onChange={(e) => setEditData(prev => ({ ...prev, watch_location: e.target.value }))}
                                  placeholder="Where did you watch this?"
                                  className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded"
                                />
                              ) : (
                                <span className="text-sm">{userMovie.watch_location}</span>
                              )}
                            </div>
                          )}

                          {/* Rating */}
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-accent fill-current" />
                            {editing ? (
                              <select
                                value={editData.personal_rating}
                                onChange={(e) => setEditData(prev => ({ ...prev, personal_rating: parseInt(e.target.value) }))}
                                className="px-2 py-1 text-sm bg-background border border-border rounded"
                              >
                                <option value={0}>No rating</option>
                                {Array.from({ length: 10 }, (_, i) => (
                                  <option key={i + 1} value={i + 1}>{i + 1}/10</option>
                                ))}
                              </select>
                            ) : (
                              <span className={cn("font-medium", getRatingColor(userMovie.personal_rating || 0))}>
                                {userMovie.personal_rating ? `${userMovie.personal_rating}/10` : 'No rating'}
                              </span>
                            )}
                          </div>

                          {/* Favorite */}
                          <div className="flex items-center gap-2">
                            <Heart className={cn("w-4 h-4", userMovie.is_favorite ? "text-red-500 fill-current" : "text-muted-foreground")} />
                            {editing ? (
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={editData.is_favorite}
                                  onChange={(e) => setEditData(prev => ({ ...prev, is_favorite: e.target.checked }))}
                                  className="rounded"
                                />
                                Favorite
                              </label>
                            ) : (
                              <span className="text-sm">{userMovie.is_favorite ? 'Favorite' : 'Not a favorite'}</span>
                            )}
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-sm font-medium mb-2">Notes</label>
                            {editing ? (
                              <textarea
                                value={editData.notes}
                                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Add your thoughts about this movie..."
                                rows={4}
                                className="w-full px-3 py-2 text-sm bg-background border border-border rounded resize-none"
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {userMovie.notes || 'No notes added yet.'}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {movie.movie_tags.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Tags
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {movie.movie_tags.map((movieTag) => (
                            <span
                              key={movieTag.id}
                              className="px-3 py-1 rounded-full text-xs font-medium border"
                              style={{
                                backgroundColor: movieTag.tag.color ? `${movieTag.tag.color}20` : 'rgba(255,255,255,0.1)',
                                borderColor: movieTag.tag.color || 'rgba(255,255,255,0.2)',
                                color: movieTag.tag.color || 'inherit',
                              }}
                            >
                              {movieTag.tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CSV Import Information */}
                    {(movie.csv_row_number || movie.csv_title) && (
                      <div className={cn(
                        "rounded-lg p-4 border",
                        matchQuality
                          ? matchQuality.severity === 'high'
                            ? "bg-red-500/10 border-red-500/30"
                            : matchQuality.severity === 'medium'
                            ? "bg-orange-500/10 border-orange-500/30"
                            : "bg-muted/30 border-border/50"
                          : "bg-muted/30 border-border/50"
                      )}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2 text-muted-foreground">
                            <Search className="w-4 h-4" />
                            Original CSV Data
                          </h4>

                          {matchQuality && (
                            <div className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                              matchQuality.severity === 'high'
                                ? "bg-red-500/20 text-red-400"
                                : matchQuality.severity === 'medium'
                                ? "bg-orange-500/20 text-orange-400"
                                : "bg-green-500/20 text-green-400"
                            )}>
                              {matchQuality.severity === 'high' && <XCircle className="w-3 h-3" />}
                              {matchQuality.severity === 'medium' && <AlertTriangle className="w-3 h-3" />}
                              {matchQuality.severity === 'low' && <CheckCircle className="w-3 h-3" />}
                              {matchQuality.confidenceScore}% match
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {/* CSV Data */}
                          <div>
                            <h5 className="font-medium mb-2 text-xs uppercase tracking-wide text-muted-foreground">Original CSV</h5>
                            <div className="space-y-1">
                              {movie.csv_row_number && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Row #:</span>
                                  <span className="font-mono">{movie.csv_row_number}</span>
                                </div>
                              )}
                              {movie.csv_title && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Title:</span>
                                  <span className="font-medium">{movie.csv_title}</span>
                                </div>
                              )}
                              {movie.csv_director && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Director:</span>
                                  <span>{movie.csv_director}</span>
                                </div>
                              )}
                              {movie.csv_year && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Year:</span>
                                  <span>{movie.csv_year}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Current TMDB Data */}
                          <div>
                            <h5 className="font-medium mb-2 text-xs uppercase tracking-wide text-muted-foreground">Current Match</h5>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">TMDB ID:</span>
                                <span className="font-mono">{movie.tmdb_id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Title:</span>
                                <span className="font-medium">{movie.title}</span>
                              </div>
                              {movie.director && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Director:</span>
                                  <span>{movie.director}</span>
                                </div>
                              )}
                              {movie.release_date && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Year:</span>
                                  <span>{formatYear(movie.release_date)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* CSV Notes */}
                        {movie.csv_notes && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wide">CSV Notes:</span>
                            <span className="text-xs italic">{movie.csv_notes}</span>
                          </div>
                        )}

                        {/* Mismatch Details */}
                        {matchQuality && matchQuality.mismatches.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center gap-1 mb-2">
                              <AlertTriangle className="w-3 h-3 text-orange-500" />
                              <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                Detected Issues
                              </span>
                            </div>
                            <ul className="text-xs space-y-1">
                              {matchQuality.mismatches.map((mismatch: string, index: number) => (
                                <li key={index} className="flex items-start gap-1">
                                  <span className="text-orange-500 mt-0.5">•</span>
                                  <span className="text-orange-600/80 dark:text-orange-400/80">{mismatch}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-2 text-xs text-orange-600/60 dark:text-orange-400/60">
                              Use "Fix Movie" above to search for the correct match.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">Movie not found</p>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* TMDB Edit Modal */}
      {editingTMDB && (
        <motion.div
          key="tmdb-edit-modal"
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setEditingTMDB(false)}
          />

          <motion.div
            className="relative w-full max-w-2xl bg-card rounded-xl shadow-2xl max-h-[80vh] overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Fix Movie Association</h2>
                <button
                  onClick={() => setEditingTMDB(false)}
                  className="p-2 hover:bg-muted rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Context Information */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                  <div>
                    <h6 className="text-xs font-medium text-muted-foreground mb-2">CURRENT MATCH</h6>
                    <div className="text-sm">
                      <div className="font-medium">{movie?.title}</div>
                      {movie?.director && <div className="text-muted-foreground">{movie.director}</div>}
                      {movie?.release_date && <div className="text-muted-foreground">{formatYear(movie.release_date)}</div>}
                    </div>
                  </div>

                  {(movie?.csv_title || movie?.csv_director) && (
                    <div>
                      <h6 className="text-xs font-medium text-muted-foreground mb-2">INTENDED (CSV)</h6>
                      <div className="text-sm">
                        {movie.csv_title && <div className="font-medium text-primary">{movie.csv_title}</div>}
                        {movie.csv_director && <div className="text-muted-foreground">{movie.csv_director}</div>}
                        {movie.csv_year && <div className="text-muted-foreground">{movie.csv_year}</div>}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Search for the correct movie using the intended title/director above:
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search for the correct movie..."
                    value={tmdbSearchQuery}
                    onChange={(e) => {
                      setTmdbSearchQuery(e.target.value);
                      searchTMDB(e.target.value);
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Loading Indicator */}
                {tmdbSearchLoading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}

                {/* Search Results */}
                {tmdbSearchResults.length > 0 && (
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {tmdbSearchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleTMDBAssociationUpdate(result.id)}
                      >
                        {result.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                            alt={result.title}
                            width={46}
                            height={69}
                            className="rounded"
                          />
                        ) : (
                          <div className="w-12 h-18 bg-muted rounded flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">No Image</span>
                          </div>
                        )}

                        <div className="flex-1">
                          <h3 className="font-medium">{result.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {result.release_date ? formatYear(result.release_date) : 'Unknown year'}
                          </p>
                          {result.overview && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {result.overview}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`https://www.themoviedb.org/movie/${result.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-background rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tmdbSearchQuery && !tmdbSearchLoading && tmdbSearchResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No movies found for "{tmdbSearchQuery}"</p>
                    <p className="text-sm mt-1">Try a different search term or check the spelling</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}