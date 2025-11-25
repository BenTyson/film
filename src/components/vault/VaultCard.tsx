'use client';

import { useMemo, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Archive, Film } from 'lucide-react';
import type { VaultWithCount } from '@/types/vault';

interface VaultCardProps {
  vault: VaultWithCount;
  onClick: () => void;
}

function VaultCardComponent({ vault, onClick }: VaultCardProps) {
  // Memoize the preview posters slice and empty cell calculation
  const displayPosters = useMemo(() => vault.preview_posters.slice(0, 4), [vault.preview_posters]);
  const emptyCellCount = useMemo(() => Math.max(0, 4 - vault.preview_posters.length), [vault.preview_posters.length]);

  // Handle keyboard activation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="group cursor-pointer"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open ${vault.name} vault with ${vault.movie_count} ${vault.movie_count === 1 ? 'film' : 'films'}`}
    >
      <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl overflow-hidden border border-gray-700/50 hover:border-purple-500/50 transition-all shadow-lg hover:shadow-2xl">
        {/* Preview Posters Grid */}
        <div className="relative h-80 bg-gray-800">
          {displayPosters.length > 0 ? (
            <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full p-2">
              {displayPosters.map((poster, idx) => (
                <div key={idx} className="relative overflow-hidden rounded-lg">
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${poster}`}
                    alt="Vault preview"
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
              {/* Fill remaining grid cells if less than 4 posters */}
              {Array.from({ length: emptyCellCount }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="relative overflow-hidden rounded-lg bg-gray-700/50 flex items-center justify-center"
                >
                  <Film className="w-8 h-8 text-gray-600" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Archive className="w-16 h-16 text-gray-600" />
            </div>
          )}

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Vault Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-bold text-white line-clamp-1 group-hover:text-purple-400 transition-colors">
              {vault.name}
            </h3>
            <span className="flex-shrink-0 px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-purple-500/30 rounded-full text-xs font-medium text-purple-300">
              {vault.movie_count} {vault.movie_count === 1 ? 'film' : 'films'}
            </span>
          </div>

          {vault.description && (
            <p className="text-sm text-gray-400 line-clamp-2">
              {vault.description}
            </p>
          )}

          {!vault.description && (
            <p className="text-sm text-gray-500 italic">
              No description
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const VaultCard = memo(VaultCardComponent);
