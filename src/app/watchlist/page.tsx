'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Grid3X3, LayoutGrid, Grip, Plus, Award, Users, Clapperboard, Film, Archive } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { WatchlistMovieModal } from '@/components/watchlist/WatchlistMovieModal';
import { AddToWatchlistModal } from '@/components/watchlist/AddToWatchlistModal';
import { TagIcon } from '@/components/ui/TagIcon';
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
  { href: '/vaults', label: 'Vaults', icon: Archive },
  { href: '/add', label: 'Add', icon: Plus },
];

export default function WatchlistPage() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
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

  const fetchMovies = useCallback(async () => {
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
  }, [selectedTag]);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      if (data.success) {
        // Show all tags (global defaults + user's custom tags)
        // This allows users to use any tags they create for watchlist filtering
        setAvailableTags(data.data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

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
    <div className="min-h-screen animated-gradient relative gradient-pulse">
      {/* Unified Navigation + Controls Header */}
      <div className={`border-b border-gray-800/50 bg-black/60 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-lg' : 'border-white/10'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">

          {/* Normal State: Two Rows - Clean and Efficient */}
          {!isScrolled && (
            <div className="space-y-3 py-3 sm:py-4">

              {/* Row 1: Navigation + Movie Count */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-between gap-3"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {/* Navigation */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 sm:gap-2">
                    {navItems.map((item) => {
                      const IconComponent = item.icon;
                      const isActive = pathname === item.href;

                      return (
                        <Link key={item.href} href={item.href}>
                          <motion.div
                            className={cn(
                              "relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px]",
                              isActive
                                ? "text-black"
                                : "text-white/70 hover:text-white"
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {isActive && (
                              <motion.div
                                className="absolute inset-0 bg-white rounded-xl shadow-lg"
                                layoutId="activeNav"
                                transition={{ duration: 0.3, ease: "easeOut" }}
                              />
                            )}
                            <IconComponent className="w-4 h-4 relative z-10" />
                            <span className="relative z-10 hidden sm:inline">{item.label}</span>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Auth Section */}
                  <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                    {isSignedIn ? (
                      <UserButton
                        afterSignOutUrl="/sign-in"
                        appearance={{
                          elements: {
                            avatarBox: 'w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity',
                            userButtonPopoverCard: 'bg-black/90 backdrop-blur-xl border border-white/10',
                            userButtonPopoverActionButton: 'hover:bg-white/10 text-white',
                            userButtonPopoverActionButtonText: 'text-white',
                            userButtonPopoverActionButtonIcon: 'text-white',
                            userButtonPopoverFooter: 'hidden',
                            userPreviewMainIdentifier: 'text-white',
                            userPreviewSecondaryIdentifier: 'text-gray-400',
                          },
                          variables: {
                            colorText: '#ffffff',
                            colorTextSecondary: '#9ca3af',
                          }
                        }}
                        showName={false}
                      />
                    ) : (
                      <Link href="/sign-in">
                        <motion.button
                          className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white rounded-xl transition-colors min-h-[44px]"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Sign In
                        </motion.button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Movie Count */}
                <span className="hidden sm:block text-gray-400 text-sm font-medium px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50 whitespace-nowrap">
                  {loading ? 'Loading...' :
                    searchQuery || selectedTag ?
                      `${filteredMovies.length} of ${movies.length} found` :
                      `${movies.length} watchlist movies`
                  }
                </span>
              </motion.div>

              {/* Row 2: Search + All Controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">

                {/* Search */}
                <div className="relative flex-1 max-w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search watchlist..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all text-white placeholder-gray-400 min-h-[44px]"
                  />
                </div>

                {/* Controls - Responsive Layout */}
                <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-start sm:justify-end">

                  {/* Add to Watchlist Button */}
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all min-h-[44px] shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add to Watchlist</span>
                    <span className="sm:hidden">Add</span>
                  </button>

                  {/* Grid Density Toggle */}
                  <div className="hidden lg:flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                    <button
                      onClick={() => setGridColumns(4)}
                      className={`p-3 transition-all min-h-[44px] min-w-[44px] ${gridColumns === 4 ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                      title="4 columns"
                    >
                      <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setGridColumns(5)}
                      className={`p-3 transition-all min-h-[44px] min-w-[44px] ${gridColumns === 5 ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                      title="5 columns"
                    >
                      <Grid3X3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setGridColumns(6)}
                      className={`p-3 transition-all min-h-[44px] min-w-[44px] ${gridColumns === 6 ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                      title="6 columns"
                    >
                      <Grip className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
        {/* Tag Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedTag(null)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all',
              selectedTag === null
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
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
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                selectedTag === tag.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              )}
            >
              {tag.icon && <TagIcon iconName={tag.icon} />}
              {tag.name}
            </button>
          ))}
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
                          className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center"
                          title={movieTag.tag.name}
                        >
                          <TagIcon iconName={movieTag.tag.icon} className="w-3 h-3 text-white" />
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
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all"
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
