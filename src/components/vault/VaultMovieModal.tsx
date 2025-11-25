'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Calendar,
  Clock,
  Play,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Tv,
} from 'lucide-react';
import { cn, formatYear } from '@/lib/utils';
import type { VaultMovieWithCollectionStatus } from '@/types/vault';
import type { WatchProvidersData } from '@/lib/tmdb';

interface VaultMovieModalProps {
  movie: VaultMovieWithCollectionStatus | null;
  vaultId: number;
  isOpen: boolean;
  onClose: () => void;
  onMovieRemoved?: () => void;
}

type TabType = 'overview' | 'details' | 'media' | 'streaming';

export function VaultMovieModal({
  movie,
  vaultId,
  isOpen,
  onClose,
  onMovieRemoved,
}: VaultMovieModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [trailer, setTrailer] = useState<{
    key: string;
    name: string;
    embed_url: string;
  } | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [loadingTrailer, setLoadingTrailer] = useState(false);

  // Watch providers state
  const [watchProviders, setWatchProviders] = useState<WatchProvidersData | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Fetch trailer when movie is available
  useEffect(() => {
    if (movie?.tmdb_id && !trailer && !loadingTrailer) {
      setLoadingTrailer(true);
      fetch(`/api/tmdb/trailer/${movie.tmdb_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setTrailer(data.data);
          }
        })
        .catch((err) => console.error('Error fetching trailer:', err))
        .finally(() => setLoadingTrailer(false));
    }
  }, [movie?.tmdb_id, trailer, loadingTrailer]);

  // Fetch watch providers when movie is available
  useEffect(() => {
    if (movie?.tmdb_id && !watchProviders && !loadingProviders) {
      setLoadingProviders(true);
      fetch(`/api/tmdb/watch-providers/${movie.tmdb_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setWatchProviders(data.data);
          }
        })
        .catch((err) => console.error('Error fetching watch providers:', err))
        .finally(() => setLoadingProviders(false));
    }
  }, [movie?.tmdb_id, watchProviders, loadingProviders]);

  // Handle Escape key to close modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isDeleting) {
      onClose();
    }
  }, [isDeleting, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleDelete = async () => {
    if (!movie) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/vaults/${vaultId}/movies/${movie.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        onMovieRemoved?.();
        onClose();
      } else {
        alert(`Failed to remove movie: ${data.error}`);
      }
    } catch (error) {
      console.error('Error removing movie from vault:', error);
      alert('Failed to remove movie from vault');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen || !movie) return null;

  const genres = movie?.genres ? (Array.isArray(movie.genres) ? movie.genres : []) : [];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/95"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-movie-title"
      >
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 z-60 bg-gradient-to-b from-black via-black/90 to-transparent">
          <div className="flex items-center justify-between p-4 lg:p-6">
            <div className="flex items-center gap-4">
              <motion.h1
                id="vault-movie-title"
                className="text-2xl lg:text-3xl font-bold text-white"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {movie.title}
              </motion.h1>

              {/* In Collection Badge */}
              {movie.in_collection && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/50 rounded-full"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">In Collection</span>
                </motion.div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {trailer && (
                <button
                  onClick={() => setShowTrailer(!showTrailer)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label={showTrailer ? "Hide trailer" : "Watch trailer"}
                >
                  <Play className="w-5 h-5 text-white" aria-hidden="true" />
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                aria-label="Remove from vault"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Remove</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-white" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 lg:px-6 pb-2">
            <div className="flex gap-4 border-b border-white/10">
              {(['overview', 'details', 'media', 'streaming'] as TabType[]).map((tab) => (
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
        </div>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto pt-32 pb-20">
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
            {showTrailer && trailer && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={trailer.embed_url}
                  title={trailer.name}
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
                    {genres.map((genre) => (
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
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Collection Status</p>
                    {movie.in_collection ? (
                      <p className="text-green-400 font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        In your collection
                      </p>
                    ) : (
                      <p className="text-gray-400 font-medium">Not in collection</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="space-y-8">
                {trailer && (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Trailer</h2>
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={trailer.embed_url}
                        title={trailer.name}
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
                    {movie.poster_path && (
                      <div className="aspect-[2/3] relative rounded-lg overflow-hidden">
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                          alt={movie.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
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

                    {watchProviders.link && (
                      <div className="pt-4 border-t border-white/10">
                        <a
                          href={watchProviders.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-white/60 hover:text-white flex items-center gap-2 transition-colors"
                        >
                          View more options on TMDB
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-xs text-white/40 mt-2">
                          Streaming data provided by JustWatch
                        </p>
                      </div>
                    )}
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
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800"
            >
              <h3 className="text-xl font-bold text-white mb-2">Remove from Vault?</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to remove &quot;{movie.title}&quot; from this vault?
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
                      Removing...
                    </>
                  ) : (
                    'Remove'
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
