/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  X,
  Search,
  Loader2,
  Calendar,
  User,
  Star,
  Plus,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TagIcon } from '@/components/ui/TagIcon';

interface AddToWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMovieAdded: () => void;
  availableTags: Array<{
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
  }>;
}

export function AddToWatchlistModal({
  isOpen,
  onClose,
  onMovieAdded,
  availableTags,
}: AddToWatchlistModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [addingMovie, setAddingMovie] = useState<number | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTags, setCustomTags] = useState<Array<{
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
  }>>([]);

  const searchTMDB = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch('/api/tmdb/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          enhanced: true,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.results || []);
      } else {
        console.error('TMDB search error:', data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching TMDB:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateCustomTag = async () => {
    const tagName = customTagInput.trim();
    if (!tagName) return;

    // Check if tag already exists
    const allTags = [...availableTags, ...customTags];
    if (allTags.some(tag => tag.name.toLowerCase() === tagName.toLowerCase())) {
      alert('A tag with this name already exists');
      return;
    }

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tagName,
          color: '#6366f1',
          icon: 'tag',
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newTag = data.data;
        setCustomTags((prev) => [...prev, newTag]);
        setSelectedTags((prev) => [...prev, newTag.id]);
        setCustomTagInput('');
      } else {
        alert(`Failed to create tag: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('Failed to create tag');
    }
  };

  const handleAddToWatchlist = async (movie: any) => {
    setAddingMovie(movie.id);
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tmdb_id: movie.id,
          title: movie.title,
          director: movie.director,
          release_date: movie.release_date,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          overview: movie.overview,
          runtime: movie.runtime,
          genres: movie.genres,
          vote_average: movie.vote_average,
          imdb_id: movie.imdb_id,
          tag_ids: selectedTags,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onMovieAdded();
        onClose();
        setSearchQuery('');
        setSearchResults([]);
        setSelectedTags([]);
      } else {
        alert(`Failed to add movie: ${data.error}`);
      }
    } catch (error) {
      console.error('Error adding movie to watchlist:', error);
      alert('Failed to add movie to watchlist');
    } finally {
      setAddingMovie(null);
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
              <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-lg">
                <Plus className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Add to Watchlist</h2>
                <p className="text-sm text-gray-400">Search for movies to add to your watchlist</p>
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
            {/* Tag Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-400">Select Mood Tags (Optional)</h3>

              {/* Default Tags */}
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                      selectedTags.includes(tag.id)
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    )}
                  >
                    {tag.icon && <TagIcon iconName={tag.icon} />}
                    {tag.name}
                  </button>
                ))}
              </div>

              {/* Custom Tags */}
              {customTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                        selectedTags.includes(tag.id)
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      )}
                    >
                      {tag.icon && <TagIcon iconName={tag.icon} />}
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Add Custom Tag Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom tag..."
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateCustomTag()}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-400"
                />
                <button
                  onClick={handleCreateCustomTag}
                  disabled={!customTagInput.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Search Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400">Search for Movie</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim()) {
                      searchTMDB(e.target.value);
                    } else {
                      setSearchResults([]);
                    }
                  }}
                  placeholder="Search TMDB for movies..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-400"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((result) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-all cursor-pointer group"
                      onClick={() => handleAddToWatchlist(result)}
                    >
                      <div className="flex items-start gap-4">
                        <Image
                          src={
                            result.poster_path
                              ? `https://image.tmdb.org/t/p/w92${result.poster_path}`
                              : '/placeholder-poster.svg'
                          }
                          alt={result.title}
                          width={48}
                          height={72}
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
                        {addingMovie === result.id ? (
                          <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                        ) : (
                          <Plus className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {!searchLoading && searchQuery && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>No results found for &quot;{searchQuery}&quot;</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
