'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  ArrowLeft,
  Calendar,
  Star,
  Heart,
  User,
  Tag,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { cn, formatYear } from '@/lib/utils';

interface SearchResult {
  tmdb_id: number;
  title: string;
  original_title: string;
  release_date: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  director: string | null;
  poster_url: string;
  backdrop_url: string;
  already_in_collection: boolean;
}

interface SearchResponse {
  success: boolean;
  data: {
    results: SearchResult[];
    page: number;
    total_pages: number;
    total_results: number;
  };
}

export default function AddMoviePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form data
  const [personalRating, setPersonalRating] = useState<number | null>(null);
  const [dateWatched, setDateWatched] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [buddyWatchedWith, setBuddyWatchedWith] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Search as you type
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchMovies(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const searchMovies = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/search/movies?q=${encodeURIComponent(query)}`);
      const data: SearchResponse = await response.json();

      if (data.success) {
        setSearchResults(data.data.results);
      }
    } catch (error) {
      console.error('Error searching movies:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMovieSelect = (movie: SearchResult) => {
    if (movie.already_in_collection) return;

    setSelectedMovie(movie);
    setShowForm(true);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddMovie = async () => {
    if (!selectedMovie) return;

    setIsAdding(true);
    try {
      const response = await fetch('/api/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tmdb_id: selectedMovie.tmdb_id,
          personal_rating: personalRating,
          date_watched: dateWatched || null,
          is_favorite: isFavorite,
          buddy_watched_with: buddyWatchedWith || null,
          tags: tags
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setSelectedMovie(null);
        setShowForm(false);
        setPersonalRating(null);
        setDateWatched('');
        setIsFavorite(false);
        setBuddyWatchedWith('');
        setTags([]);
        setSearchQuery('');
        setSearchResults([]);

        // Navigate back to home
        router.push('/');
      } else {
        console.error('Error adding movie:', data.error);
      }
    } catch (error) {
      console.error('Error adding movie:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cinema-black via-cinema-dark to-cinema-gray">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <Plus className="w-8 h-8 text-cinema-gold" />
              <h1 className="text-4xl font-heading font-bold">
                Add Movie
              </h1>
            </div>
          </div>

          <p className="text-muted-foreground">
            Search for movies to add to your collection
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showForm ? (
          <>
            {/* Search Input */}
            <div className="relative mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search for movies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinema-gold/50 text-lg"
                />
                {isSearching && (
                  <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-cinema-gold" />
                )}
              </div>
            </div>

            {/* Search Results */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {searchResults.map((movie) => (
                    <motion.div
                      key={movie.tmdb_id}
                      className={cn(
                        "flex gap-4 p-4 bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 transition-all duration-300",
                        movie.already_in_collection
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-cinema-gold/50 cursor-pointer hover:bg-card/40"
                      )}
                      onClick={() => handleMovieSelect(movie)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={movie.already_in_collection ? {} : { scale: 1.02 }}
                    >
                      <div className="w-20 h-30 relative flex-shrink-0">
                        <Image
                          src={movie.poster_url || '/placeholder-poster.svg'}
                          alt={movie.title}
                          fill
                          className="object-cover rounded"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold mb-1">{movie.title}</h3>
                            {movie.director && (
                              <p className="text-sm text-muted-foreground mb-2">
                                Directed by {movie.director}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground mb-2">
                              {formatYear(movie.release_date)} • ⭐ {movie.vote_average.toFixed(1)}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {movie.overview}
                            </p>
                          </div>

                          {movie.already_in_collection && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                              <Check className="w-3 h-3" />
                              In Collection
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No movies found</h3>
                <p className="text-muted-foreground">
                  Try searching with different keywords
                </p>
              </div>
            )}
          </>
        ) : (
          /* Add Movie Form */
          <motion.div
            className="bg-card/30 backdrop-blur-sm rounded-lg border border-border/50 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Selected Movie Header */}
            <div className="relative h-48 overflow-hidden">
              {selectedMovie?.backdrop_url && (
                <Image
                  src={selectedMovie.backdrop_url}
                  alt={selectedMovie.title}
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-end gap-4">
                  <div className="w-16 h-24 relative flex-shrink-0">
                    <Image
                      src={selectedMovie?.poster_url || '/placeholder-poster.svg'}
                      alt={selectedMovie?.title || ''}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1">{selectedMovie?.title}</h2>
                    <p className="text-sm text-gray-300">
                      {formatYear(selectedMovie?.release_date || '')} • ⭐ {selectedMovie?.vote_average.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Rating */}
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Personal Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setPersonalRating(personalRating === rating ? null : rating)}
                      className={cn(
                        "w-10 h-10 rounded-lg border transition-colors",
                        personalRating === rating
                          ? "bg-cinema-gold text-black border-cinema-gold"
                          : "border-border/50 hover:border-cinema-gold/50"
                      )}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Watched */}
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date Watched
                </label>
                <input
                  type="date"
                  value={dateWatched}
                  onChange={(e) => setDateWatched(e.target.value)}
                  className="w-full px-4 py-3 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinema-gold/50"
                />
              </div>

              {/* Favorite */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={(e) => setIsFavorite(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
                    isFavorite ? "bg-red-500 border-red-500" : "border-border/50"
                  )}>
                    {isFavorite && <Heart className="w-4 h-4 text-white fill-current" />}
                  </div>
                  <span className="text-sm font-medium">Mark as Favorite</span>
                </label>
              </div>

              {/* Buddy Watched With */}
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Watched With
                </label>
                <input
                  type="text"
                  placeholder="Who did you watch this with?"
                  value={buddyWatchedWith}
                  onChange={(e) => setBuddyWatchedWith(e.target.value)}
                  className="w-full px-4 py-3 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinema-gold/50"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 px-4 py-3 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinema-gold/50"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-3 bg-cinema-gold text-black rounded-lg hover:bg-cinema-gold/90 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  Back to Search
                </button>
                <button
                  onClick={handleAddMovie}
                  disabled={isAdding}
                  className="flex-1 px-6 py-3 bg-cinema-gold text-black rounded-lg hover:bg-cinema-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add to Collection
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}