/* eslint-disable @typescript-eslint/no-unused-vars */
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
  X,
  Film,
  Clock,
  Users,
  Edit3,
  AlertCircle,
  Sparkles
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

interface BuddyPreset {
  name: string;
  icon: string;
  color: string;
}

const TAG_SUGGESTIONS = [
  'Must Rewatch',
  'Mind Blowing',
  'Comfort Movie',
  'Date Night',
  'Family Movie',
  'Weekend Watch',
  'Oscar Worthy',
  'Hidden Gem',
];

export default function AddMoviePage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [addedSuccessfully, setAddedSuccessfully] = useState(false);
  const [buddyPresets, setBuddyPresets] = useState<BuddyPreset[]>([]);

  // Form data
  const [personalRating, setPersonalRating] = useState<number | null>(null);
  const [dateWatched, setDateWatched] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [buddies, setBuddies] = useState<string[]>([]); // Changed to array
  const [buddyInput, setBuddyInput] = useState(''); // New input state
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch buddy presets on mount
  useEffect(() => {
    const fetchBuddyPresets = async () => {
      try {
        const response = await fetch('/api/buddies');
        const data = await response.json();
        if (data.success) {
          setBuddyPresets(data.data);
        }
      } catch (error) {
        console.error('Error fetching buddy presets:', error);
      }
    };

    fetchBuddyPresets();
  }, []);

  // Auto-focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to clear search or go back
      if (e.key === 'Escape') {
        if (showForm) {
          setShowForm(false);
        } else if (searchQuery) {
          setSearchQuery('');
          setSearchResults([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, searchQuery]);

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
    // Auto-focus notes after a brief delay
    setTimeout(() => notesTextareaRef.current?.focus(), 100);
  };

  const handleAddTag = (tagToAdd?: string) => {
    const tag = tagToAdd || tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const setTodayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateWatched(today);
  };

  const handleAddBuddy = (buddyToAdd?: string) => {
    const buddy = buddyToAdd || buddyInput.trim();
    if (buddy && !buddies.includes(buddy)) {
      setBuddies([...buddies, buddy]);
      setBuddyInput('');
    }
  };

  const removeBuddy = (buddyToRemove: string) => {
    setBuddies(buddies.filter(b => b !== buddyToRemove));
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
          buddy_watched_with: buddies.length > 0 ? buddies : null,
          tags: tags,
          notes: notes || null
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Show success message
        setAddedSuccessfully(true);

        // Reset form
        setTimeout(() => {
          setSelectedMovie(null);
          setShowForm(false);
          setPersonalRating(null);
          setDateWatched('');
          setIsFavorite(false);
          setBuddies([]);
          setBuddyInput('');
          setTags([]);
          setNotes('');
          setSearchQuery('');
          setSearchResults([]);
          setAddedSuccessfully(false);

          // Refocus search
          searchInputRef.current?.focus();
        }, 2000);
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
    <div className="min-h-screen animated-gradient relative gradient-pulse">
      {/* Success Toast */}
      <AnimatePresence>
        {addedSuccessfully && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-green-500 text-white rounded-lg shadow-lg flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            Movie added successfully!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-border/50 bg-card/20 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <Plus className="w-8 h-8 text-purple-400" />
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showForm ? (
          <>
            {/* Enhanced Search Input */}
            <div className="relative mb-8">
              <motion.div
                className="relative"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for movies... (Try a title, director, or actor)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-cinema-gold/50 text-lg placeholder:text-muted-foreground/60 transition-all"
                />
                {isSearching && (
                  <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-purple-400" />
                )}
                {searchQuery && !isSearching && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted/50 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
              {searchQuery.length >= 2 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-xs text-muted-foreground ml-4"
                >
                  Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to clear
                </motion.p>
              )}
            </div>

            {/* Search Results with Enhanced UI */}
            <AnimatePresence mode="popLayout">
              {searchResults.length > 0 && (
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-sm text-muted-foreground">
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </p>
                  {searchResults.map((movie, index) => (
                    <motion.div
                      key={movie.tmdb_id}
                      className={cn(
                        "group flex gap-4 p-4 bg-card/30 backdrop-blur-sm rounded-xl border transition-all duration-300",
                        movie.already_in_collection
                          ? "border-green-500/30 opacity-60 cursor-not-allowed"
                          : "border-border/50 hover:border-purple-500/50 cursor-pointer hover:bg-card/50"
                      )}
                      onClick={() => handleMovieSelect(movie)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={movie.already_in_collection ? {} : { scale: 1.01 }}
                    >
                      {/* Poster */}
                      <div className="relative w-24 h-36 flex-shrink-0 overflow-hidden rounded-lg">
                        {movie.poster_url ? (
                          <Image
                            src={movie.poster_url}
                            alt={movie.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                            <Film className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-1 group-hover:text-purple-400 transition-colors">
                              {movie.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
                              {movie.director && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {movie.director}
                                </span>
                              )}
                              {movie.release_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatYear(movie.release_date)}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500" />
                                {movie.vote_average?.toFixed(1) || 'N/A'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {movie.overview || 'No overview available.'}
                            </p>
                          </div>

                          {movie.already_in_collection ? (
                            <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm whitespace-nowrap">
                              <Check className="w-4 h-4" />
                              In Collection
                            </div>
                          ) : (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-5 h-5 text-purple-400" />
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
              <motion.div
                className="text-center py-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No movies found</h3>
                <p className="text-muted-foreground">
                  Try searching with different keywords
                </p>
              </motion.div>
            )}

            {/* Initial State */}
            {!searchQuery && (
              <motion.div
                className="text-center py-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Sparkles className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Start typing to search</h3>
                <p className="text-muted-foreground">
                  Find any movie to add to your collection
                </p>
              </motion.div>
            )}
          </>
        ) : (
          /* Enhanced Add Movie Form */
          <motion.div
            className="bg-card/30 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Selected Movie Header */}
            <div className="relative h-56 overflow-hidden">
              {selectedMovie?.backdrop_url && (
                <Image
                  src={selectedMovie.backdrop_url}
                  alt={selectedMovie.title}
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <button
                onClick={() => setShowForm(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-end gap-4">
                  <div className="w-20 h-30 relative flex-shrink-0 rounded-lg overflow-hidden shadow-xl">
                    {selectedMovie?.poster_url ? (
                      <Image
                        src={selectedMovie.poster_url}
                        alt={selectedMovie.title || ''}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted/40 flex items-center justify-center">
                        <Film className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-bold mb-2">{selectedMovie?.title}</h2>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                      {selectedMovie?.director && (
                        <span>{selectedMovie.director}</span>
                      )}
                      {selectedMovie?.director && selectedMovie?.release_date && (
                        <span>•</span>
                      )}
                      {selectedMovie?.release_date && (
                        <span>{formatYear(selectedMovie.release_date)}</span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        {selectedMovie?.vote_average.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Rating - Enhanced */}
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Your Rating
                </label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <motion.button
                      key={rating}
                      onClick={() => setPersonalRating(personalRating === rating ? null : rating)}
                      className={cn(
                        "w-12 h-12 rounded-lg border-2 font-medium transition-all",
                        personalRating === rating
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white border-purple-500 scale-110 shadow-lg"
                          : "border-border/50 hover:border-purple-500/50 hover:scale-105"
                      )}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {rating}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Date Watched - Enhanced */}
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Date Watched
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateWatched}
                    onChange={(e) => setDateWatched(e.target.value)}
                    className="flex-1 px-4 py-3 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinema-gold/50"
                  />
                  <button
                    onClick={setTodayDate}
                    className="px-4 py-3 bg-muted/50 hover:bg-muted/70 border border-border/50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Today
                  </button>
                </div>
              </div>

              {/* Notes Field - NEW */}
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-purple-500" />
                  Notes & Thoughts
                </label>
                <textarea
                  ref={notesTextareaRef}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you think? Any memorable moments?"
                  className="w-full px-4 py-3 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinema-gold/50 resize-none h-24"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {notes.length}/500 characters
                </p>
              </div>

              {/* Buddy Watched With - Like Tags System */}
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-500" />
                  Watched With
                </label>
                {buddyPresets.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {buddyPresets.map((buddy) => (
                      <button
                        key={buddy.name}
                        onClick={() => handleAddBuddy(buddy.name)}
                        disabled={buddies.includes(buddy.name)}
                        className={cn(
                          "px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2",
                          buddies.includes(buddy.name)
                            ? "bg-primary/20 border-primary text-primary opacity-50 cursor-not-allowed"
                            : "border-border/50 hover:border-primary/50"
                        )}
                      >
                        <span>{buddy.icon}</span>
                        <span className={buddy.color}>{buddy.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom name..."
                    value={buddyInput}
                    onChange={(e) => setBuddyInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddBuddy()}
                    className="flex-1 px-4 py-3 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinema-gold/50"
                  />
                  <button
                    onClick={() => handleAddBuddy()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:bg-cinema-gold/90 transition-colors font-medium"
                  >
                    Add
                  </button>
                </div>
                {buddies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {buddies.map((buddy) => (
                      <span
                        key={buddy}
                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-2 border border-green-500/40"
                      >
                        {buddy}
                        <button
                          onClick={() => removeBuddy(buddy)}
                          className="hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Favorite Toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-background/30 rounded-lg border border-border/50 hover:border-red-500/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={(e) => setIsFavorite(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                    isFavorite ? "bg-red-500 border-red-500 scale-110" : "border-border/50"
                  )}>
                    {isFavorite && <Heart className="w-4 h-4 text-white fill-current" />}
                  </div>
                  <span className="text-sm font-medium">
                    {isFavorite ? 'Added to Favorites ❤️' : 'Add to Favorites'}
                  </span>
                </label>
              </div>

              {/* Tags - Enhanced with Suggestions */}
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-orange-500" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {TAG_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleAddTag(suggestion)}
                      disabled={tags.includes(suggestion)}
                      className={cn(
                        "px-3 py-1 text-sm rounded-lg border transition-colors",
                        tags.includes(suggestion)
                          ? "border-primary/50 bg-primary/20 text-primary opacity-50 cursor-not-allowed"
                          : "border-border/50 hover:border-primary/50 hover:bg-primary/10"
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 px-4 py-3 bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cinema-gold/50"
                  />
                  <button
                    onClick={() => handleAddTag()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:bg-cinema-gold/90 transition-colors font-medium"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
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

              {/* Action Buttons - Enhanced */}
              <div className="flex gap-3 pt-4 border-t border-border/50">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors font-medium"
                >
                  Back to Search
                </button>
                <motion.button
                  onClick={handleAddMovie}
                  disabled={isAdding}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:bg-cinema-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}