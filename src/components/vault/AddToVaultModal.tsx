'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { TMDBEnhancedSearchResult } from '@/types/tmdb';
import { TMDBMovieSearch } from '@/components/search';

interface AddToVaultModalProps {
  vaultId: number;
  vaultName: string;
  isOpen: boolean;
  onClose: () => void;
  onMovieAdded: () => void;
}

function AddToVaultModalComponent({
  vaultId,
  vaultName,
  isOpen,
  onClose,
  onMovieAdded,
}: AddToVaultModalProps) {
  const [addingMovie, setAddingMovie] = useState<number | null>(null);

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

  const handleAddToVault = useCallback(async (movie: TMDBEnhancedSearchResult) => {
    setAddingMovie(movie.id);
    try {
      const response = await fetch(`/api/vaults/${vaultId}/movies`, {
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
        }),
      });

      const data = await response.json();

      if (data.success) {
        onMovieAdded();
        onClose();
      } else {
        alert(`Failed to add movie: ${data.error}`);
      }
    } catch (error) {
      console.error('Error adding movie to vault:', error);
      alert('Failed to add movie to vault');
    } finally {
      setAddingMovie(null);
    }
  }, [vaultId, onMovieAdded, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-vault-title"
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
                <h2 id="add-to-vault-title" className="text-xl font-bold text-white">Add to {vaultName}</h2>
                <p className="text-sm text-gray-400">Search for movies to add to this vault</p>
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
          <div className="p-6">
            <TMDBMovieSearch
              onMovieSelect={handleAddToVault}
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
export const AddToVaultModal = memo(AddToVaultModalComponent);
