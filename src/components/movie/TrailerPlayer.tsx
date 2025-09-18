'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Volume2, VolumeX, Maximize, Minimize, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrailerData {
  key: string;
  name: string;
  type: string;
  site: string;
  official: boolean;
  youtube_url: string;
  embed_url: string;
  thumbnail_url: string;
  all_trailers?: {
    key: string;
    name: string;
    type: string;
    official: boolean;
    youtube_url: string;
    embed_url: string;
  }[];
}

interface TrailerPlayerProps {
  trailer: TrailerData;
  autoPlay?: boolean;
  className?: string;
}

export function TrailerPlayer({ trailer, autoPlay = false, className }: TrailerPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState(trailer);

  const handlePlayTrailer = () => {
    setIsPlaying(true);
  };

  const handleCloseTrailer = () => {
    setIsPlaying(false);
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const embedUrl = `${selectedTrailer.embed_url}?autoplay=${autoPlay ? 1 : 0}&rel=0&modestbranding=1&controls=1`;

  if (!trailer) return null;

  return (
    <div className={cn("relative", className)}>
      {/* Trailer Thumbnail/Play Button */}
      {!isPlaying && (
        <motion.div
          className="relative group cursor-pointer rounded-lg overflow-hidden bg-black"
          onClick={handlePlayTrailer}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="aspect-video bg-cover bg-center"
            style={{ backgroundImage: `url(${trailer.thumbnail_url})` }}
          />

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="flex items-center justify-center w-16 h-16 bg-primary rounded-full shadow-lg group-hover:bg-primary/90 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
            </motion.div>
          </div>

          {/* Trailer info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between text-white">
              <div>
                <h4 className="font-semibold">{trailer.name}</h4>
                <p className="text-sm text-gray-300 flex items-center gap-2">
                  {trailer.type}
                  {trailer.official && (
                    <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded">
                      OFFICIAL
                    </span>
                  )}
                </p>
              </div>
              <ExternalLink className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Multiple Trailers Selector */}
      {trailer.all_trailers && trailer.all_trailers.length > 1 && !isPlaying && (
        <div className="mt-3">
          <p className="text-sm font-medium mb-2">More Trailers:</p>
          <div className="flex flex-wrap gap-2">
            {trailer.all_trailers.map((t, index) => (
              <button
                key={t.key}
                onClick={() => setSelectedTrailer({
                  ...t,
                  thumbnail_url: `https://img.youtube.com/vi/${t.key}/hqdefault.jpg`,
                  all_trailers: trailer.all_trailers,
                })}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  selectedTrailer.key === t.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t.name}
                {t.official && " ★"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center bg-black/95",
              isFullscreen ? "p-0" : "p-4"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Video Container */}
            <motion.div
              className={cn(
                "relative bg-black rounded-lg overflow-hidden shadow-2xl",
                isFullscreen ? "w-full h-full" : "w-full max-w-4xl"
              )}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Video */}
              <div className={cn("relative", isFullscreen ? "h-full" : "aspect-video")}>
                <iframe
                  src={embedUrl}
                  title={selectedTrailer.name}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Controls Overlay */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleCloseTrailer}
                  className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Trailer Info (only in windowed mode) */}
              {!isFullscreen && (
                <div className="absolute bottom-4 left-4 text-white">
                  <h4 className="font-semibold text-lg">{selectedTrailer.name}</h4>
                  <p className="text-sm text-gray-300 flex items-center gap-2">
                    {selectedTrailer.type}
                    {selectedTrailer.official && (
                      <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded">
                        OFFICIAL
                      </span>
                    )}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Background click to close */}
            <div
              className="absolute inset-0 -z-10"
              onClick={handleCloseTrailer}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact version for movie cards
export function TrailerPreview({ trailer, className }: { trailer: TrailerData; className?: string }) {
  const [isHovered, setIsHovered] = useState(false);

  if (!trailer) return null;

  return (
    <div
      className={cn("relative group", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        initial={false}
        animate={{ opacity: isHovered ? 1 : 0 }}
      >
        <motion.div
          className="flex items-center justify-center w-12 h-12 bg-primary/90 backdrop-blur-sm rounded-full shadow-lg"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          <Play className="w-4 h-4 text-primary-foreground ml-0.5" fill="currentColor" />
        </motion.div>
      </motion.div>
    </div>
  );
}