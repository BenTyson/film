'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TagIcon } from '@/components/ui/TagIcon';
import { TMDBEnhancedSearchResult } from '@/types/tmdb';
import { TMDBMovieSearch } from '@/components/search';

interface TagData {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
}

interface AddToWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMovieAdded: () => void;
  availableTags: TagData[];
}

function AddToWatchlistModalComponent({
  isOpen,
  onClose,
  onMovieAdded,
  availableTags,
}: AddToWatchlistModalProps) {
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [addingMovie, setAddingMovie] = useState<number | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTags, setCustomTags] = useState<TagData[]>([]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !addingMovie) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, addingMovie, onClose]);

  const toggleTag = useCallback((tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const handleCreateCustomTag = useCallback(async () => {
    const tagName = customTagInput.trim();
    if (!tagName) return;

    const allTags = [...availableTags, ...customTags];
    if (allTags.some(tag => tag.name.toLowerCase() === tagName.toLowerCase())) {
      alert('A tag with this name already exists');
      return;
    }

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName, color: '#6366f1', icon: 'tag' }),
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
  }, [customTagInput, availableTags, customTags]);

  const handleAddToWatchlist = useCallback(async (movie: TMDBEnhancedSearchResult) => {
    setAddingMovie(movie.id);
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  }, [selectedTags, onMovieAdded, onClose]);

  const renderTagButton = useCallback((tag: TagData) => (
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
  ), [selectedTags, toggleTag]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-watchlist-title"
      >
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
                <Plus className="w-5 h-5 text-purple-400" aria-hidden="true" />
              </div>
              <div>
                <h2 id="add-to-watchlist-title" className="text-xl font-bold text-white">Add to Watchlist</h2>
                <p className="text-sm text-gray-400">Search for movies to add to your watchlist</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Tag Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-400">Select Mood Tags (Optional)</h3>

              <div className="flex flex-wrap gap-2">
                {availableTags.map(renderTagButton)}
              </div>

              {customTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customTags.map(renderTagButton)}
                </div>
              )}

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
            <TMDBMovieSearch
              onMovieSelect={handleAddToWatchlist}
              addingMovieId={addingMovie}
              label="Search for Movie"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Memoize the modal to prevent re-renders from parent state changes
export const AddToWatchlistModal = memo(AddToWatchlistModalComponent);
