'use client';

import { useState, useEffect } from 'react';
import { Search, Grid3X3, LayoutGrid, Grip, Plus, Award, Users, Clapperboard, Film } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { WatchlistMovieModal } from '@/components/watchlist/WatchlistMovieModal';
import { AddToWatchlistModal } from '@/components/watchlist/AddToWatchlistModal';
import Image from 'next/image';

interface WatchlistMovie {
  id: number;
  tmdb_id: number;
  title: string;
  director: string | null;
  release_date: Date | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number | null;
  tags: Array<{
    id: number;
    tag: {
      id: number;
      name: string;
      color: string | null;
      icon: string | null;
    };
  }>;
}

interface Tag {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
}

const navItems = [
  { href: '/', label: 'Collection', icon: Clapperboard },
  { href: '/oscars', label: 'Oscars', icon: Award },
  { href: '/buddy/calen', label: 'Calen', icon: Users },
  { href: '/watchlist', label: 'Watchlist', icon: Film },
  { href: '/add', label: 'Add', icon: Plus },
];

export default function WatchlistPage() {
  const pathname = usePathname();
  const [movies, setMovies] = useState<WatchlistMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [gridColumns, setGridColumns] = useState<4 | 5 | 6>(6);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTag) {
        params.append('tagId', selectedTag.toString());
      }

      const response = await fetch(`/api/watchlist?${params}`);
      const data = await response.json();

      if (data.success) {
        setMovies(data.data);
      }
    } catch (error) {
      console.error('Error fetching watchlist movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      if (data.success) {
        // Filter to only show watchlist mood tags
        const watchlistTags = data.data.filter((tag: Tag) =>
          ['Morgan', 'Liam', 'Epic', 'Scary', 'Indie'].includes(tag.name)
        );
        setAvailableTags(watchlistTags);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, [selectedTag]);

  useEffect(() => {
    fetchTags();
  }, []);

  const handleMovieClick = (movieId: number) => {
    setSelectedMovieId(movieId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMovieId(null);
  };

  const handleMovieUpdate = () => {
    fetchMovies();
  };

  // Filter movies by search query
  const filteredMovies = movies.filter((movie) => {
    if (!debouncedSearchQuery) return true;
    const query = debouncedSearchQuery.toLowerCase();
    return (
      movie.title.toLowerCase().includes(query) ||
      movie.director?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      {/* Navigation */}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
          isScrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <Film className="w-8 h-8 text-blue-500" />
                <span className="text-xl font-bold">Film Collection</span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Watchlist</h1>
          <p className="text-gray-400">Movies you want to watch</p>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search watchlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-400"
            />
          </div>

          {/* Grid Size */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setGridColumns(4)}
              className={cn(
                'p-2 rounded transition-all',
                gridColumns === 4 ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              )}
              title="Large grid"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridColumns(5)}
              className={cn(
                'p-2 rounded transition-all',
                gridColumns === 5 ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              )}
              title="Medium grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridColumns(6)}
              className={cn(
                'p-2 rounded transition-all',
                gridColumns === 6 ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              )}
              title="Small grid"
            >
              <Grip className="w-4 h-4" />
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Movie</span>
          </button>
        </div>

        {/* Tag Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedTag(null)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all',
              selectedTag === null
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            )}
          >
            All
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                selectedTag === tag.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              )}
            >
              {tag.icon && <span className="mr-1">{tag.icon}</span>}
              {tag.name}
            </button>
          ))}
        </div>

        {/* Movie Count */}
        <div className="mb-4 text-gray-400">
          {filteredMovies.length} {filteredMovies.length === 1 ? 'movie' : 'movies'}
        </div>

        {/* Movies Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : filteredMovies.length > 0 ? (
          <div
            className={cn(
              'grid gap-4 mb-8',
              gridColumns === 4 && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
              gridColumns === 5 && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
              gridColumns === 6 && 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'
            )}
          >
            {filteredMovies.map((movie) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                className="group cursor-pointer"
                onClick={() => handleMovieClick(movie.id)}
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                  {movie.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={movie.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-600">
                      <Film className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <h3 className="text-white font-semibold text-sm line-clamp-2">{movie.title}</h3>
                    {movie.director && (
                      <p className="text-gray-300 text-xs mt-1">{movie.director}</p>
                    )}
                  </div>
                  {/* Tags badge */}
                  {movie.tags && movie.tags.length > 0 && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      {movie.tags.slice(0, 2).map((movieTag) => (
                        <div
                          key={movieTag.id}
                          className="w-6 h-6 rounded-full bg-blue-500/80 flex items-center justify-center text-xs"
                          title={movieTag.tag.name}
                        >
                          {movieTag.tag.icon || movieTag.tag.name[0]}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No movies in watchlist</h3>
            <p className="text-gray-500 mb-6">Start adding movies you want to watch</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Your First Movie
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <WatchlistMovieModal
        movieId={selectedMovieId}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onMovieUpdate={handleMovieUpdate}
      />

      <AddToWatchlistModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onMovieAdded={handleMovieUpdate}
        availableTags={availableTags}
      />
    </div>
  );
}
