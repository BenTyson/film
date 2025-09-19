'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Search,
  Loader2,
  Calendar,
  User,
  Star,
  ExternalLink,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FixMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMovie: {
    id: number;
    title: string;
    director?: string | null;
    release_date?: Date | null;
  };
  csvData?: {
    title: string;
    director?: string;
    year?: string;
  };
  onMovieFixed: (newTmdbId: number) => Promise<void>;
}

export function FixMovieModal({
  isOpen,
  onClose,
  currentMovie,
  csvData,
  onMovieFixed
}: FixMovieModalProps) {
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbSearchResults, setTmdbSearchResults] = useState<any[]>([]);
  const [tmdbSearchLoading, setTmdbSearchLoading] = useState(false);
  const [fixingMovie, setFixingMovie] = useState<number | null>(null);
  const [tmdbDirectLink, setTmdbDirectLink] = useState('');
  const [directLinkLoading, setDirectLinkLoading] = useState(false);

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

  const handleDirectLink = async () => {
    if (!tmdbDirectLink.trim()) return;

    setDirectLinkLoading(true);
    try {
      // Extract TMDB ID from URL or use as direct ID
      const tmdbIdMatch = tmdbDirectLink.match(/\/movie\/(\d+)/);
      const tmdbId = tmdbIdMatch ? tmdbIdMatch[1] : tmdbDirectLink.trim();

      if (!/^\d+$/.test(tmdbId)) {
        alert('Please enter a valid TMDB movie ID or URL');
        return;
      }

      const response = await fetch('/api/tmdb/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: tmdbId, // The API will detect this as an ID
          enhanced: true
        })
      });
      const data = await response.json();

      if (data.success && data.results.length > 0) {
        const movie = data.results[0];
        setTmdbSearchResults([movie]);
        setTmdbSearchQuery(''); // Clear text search when using direct link
      } else {
        alert('Movie not found with that TMDB ID');
      }
    } catch (error) {
      console.error('Error fetching movie by ID:', error);
      alert('Failed to fetch movie. Please check the ID/URL and try again.');
    } finally {
      setDirectLinkLoading(false);
    }
  };

  const handleSelectMovie = async (tmdbMovie: any) => {
    console.log('Fixing movie with:', { currentMovieId: currentMovie.id, tmdbMovieId: tmdbMovie.id, tmdbMovie });
    setFixingMovie(tmdbMovie.id);
    try {
      // Call the API to update the movie with new TMDB association
      const response = await fetch(`/api/movies/${currentMovie.id}/update-tmdb`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newTmdbId: tmdbMovie.id,
          reason: 'Manual fix from approval workflow'
        })
      });

      if (response.ok) {
        await onMovieFixed(tmdbMovie.id);
        onClose();
      } else {
        const data = await response.json();
        alert(`Failed to update movie: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating movie:', error);
      alert('Failed to update movie');
    } finally {
      setFixingMovie(null);
    }
  };

  // Pre-populate search with CSV data on open
  useState(() => {
    if (isOpen && csvData) {
      const searchTerm = csvData.director
        ? `${csvData.title} ${csvData.director}`
        : csvData.title;
      setTmdbSearchQuery(searchTerm);
      searchTMDB(searchTerm);
    }
  });

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <motion.div
        className="relative bg-card border border-border rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Fix Movie Association</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current vs CSV Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-muted/20 rounded-lg">
            <div>
              <h3 className="font-medium mb-2 text-blue-400">Current TMDB Match</h3>
              <div className="text-sm space-y-1">
                <div><strong>Title:</strong> {currentMovie.title}</div>
                {currentMovie.director && <div><strong>Director:</strong> {currentMovie.director}</div>}
                {currentMovie.release_date && (
                  <div><strong>Year:</strong> {new Date(currentMovie.release_date).getFullYear()}</div>
                )}
              </div>
            </div>

            {csvData && (
              <div>
                <h3 className="font-medium mb-2 text-orange-400">CSV Data</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Title:</strong> {csvData.title}</div>
                  {csvData.director && <div><strong>Director:</strong> {csvData.director}</div>}
                  {csvData.year && <div><strong>Year:</strong> {csvData.year}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Direct TMDB Link Input */}
          <div className="mb-6">
            <h3 className="font-medium mb-3 text-emerald-400 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Direct TMDB Link/ID
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter TMDB URL (e.g., https://www.themoviedb.org/movie/12345) or just ID (12345)"
                value={tmdbDirectLink}
                onChange={(e) => setTmdbDirectLink(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDirectLink()}
                className="flex-1 px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleDirectLink}
                disabled={directLinkLoading || !tmdbDirectLink.trim()}
                className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {directLinkLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Fetch
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use this when the search below doesn't find the correct movie. You can paste a full TMDB URL or just the movie ID number.
            </p>
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-sm text-muted-foreground font-medium">OR SEARCH</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search for the correct movie by title..."
                value={tmdbSearchQuery}
                onChange={(e) => {
                  setTmdbSearchQuery(e.target.value);
                  searchTMDB(e.target.value);
                  // Clear direct link when typing in search
                  if (e.target.value.trim()) {
                    setTmdbDirectLink('');
                  }
                }}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto">
            {tmdbSearchLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}

            {!tmdbSearchLoading && tmdbSearchResults.length > 0 && (
              <div className="space-y-3">
                {tmdbSearchResults.map((movie) => (
                  <div
                    key={movie.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-16 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                      {movie.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                          No Poster
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium mb-1">{movie.title}</h3>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {movie.release_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(movie.release_date).getFullYear()}
                              </div>
                            )}
                            {movie.vote_average > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {movie.vote_average.toFixed(1)}/10
                              </div>
                            )}
                          </div>
                          {movie.overview && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {movie.overview}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleSelectMovie(movie)}
                          disabled={fixingMovie === movie.id}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 ml-4"
                        >
                          {fixingMovie === movie.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Select This Movie
                        </button>
                      </div>
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
  );
}