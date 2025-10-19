'use client';

import { useState, useEffect, use } from 'react';
import {
  Search,
  Grid3X3,
  LayoutGrid,
  Grip,
  Plus,
  Award,
  Users,
  Clapperboard,
  Film,
  Archive,
  ArrowLeft,
  Edit,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { AddToVaultModal } from '@/components/vault/AddToVaultModal';
import { VaultMovieModal } from '@/components/vault/VaultMovieModal';
import { EditVaultModal } from '@/components/vault/EditVaultModal';
import { MovieDetailsModal } from '@/components/movie/MovieDetailsModal';
import Image from 'next/image';
import type { VaultWithMovies, VaultMovieWithCollectionStatus } from '@/types/vault';

const allNavItems = [
  { href: '/', label: 'Collection', icon: Clapperboard },
  { href: '/oscars', label: 'Oscars', icon: Award },
  { href: '/buddy/calen', label: 'Calen', icon: Users, adminOnly: true },
  { href: '/watchlist', label: 'Watchlist', icon: Film },
  { href: '/vaults', label: 'Vaults', icon: Archive },
  { href: '/add', label: 'Add', icon: Plus },
];

export default function VaultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const vaultId = parseInt(unwrappedParams.id);
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [vault, setVault] = useState<VaultWithMovies | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [gridColumns, setGridColumns] = useState<4 | 5 | 6>(6);
  const [selectedMovie, setSelectedMovie] = useState<VaultMovieWithCollectionStatus | null>(null);
  const [isMovieModalOpen, setIsMovieModalOpen] = useState(false);
  const [selectedCollectionMovieId, setSelectedCollectionMovieId] = useState<number | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showInCollectionOnly, setShowInCollectionOnly] = useState(false);

  // Check admin status from database
  useEffect(() => {
    async function checkAdminStatus() {
      if (!isSignedIn) {
        setIsAdmin(false);
        return;
      }

      try {
        const response = await fetch('/api/user/me');
        if (!response.ok) {
          setIsAdmin(false);
          return;
        }

        const data = await response.json();
        setIsAdmin(data.success && data.data?.role === 'admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    }

    checkAdminStatus();
  }, [isSignedIn, user?.id]);

  // Filter nav items based on admin status
  const navItems = allNavItems.filter(item => {
    if (item.adminOnly) {
      return isAdmin;
    }
    return true;
  });


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

  const fetchVault = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/vaults/${vaultId}`);
      const data = await response.json();

      if (data.success) {
        setVault(data.data);
      } else {
        console.error('Failed to fetch vault:', data.error);
        router.push('/vaults');
      }
    } catch (error) {
      console.error('Error fetching vault:', error);
      router.push('/vaults');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vaultId) {
      fetchVault();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultId]);

  const handleMovieClick = (movie: VaultMovieWithCollectionStatus) => {
    if (movie.in_collection && movie.collection_movie_id) {
      // Movie is in collection - use full MovieDetailsModal
      setSelectedCollectionMovieId(movie.collection_movie_id);
      setIsCollectionModalOpen(true);
    } else {
      // Movie not in collection - use VaultMovieModal
      setSelectedMovie(movie);
      setIsMovieModalOpen(true);
    }
  };

  const handleMovieModalClose = () => {
    setIsMovieModalOpen(false);
    setSelectedMovie(null);
  };

  const handleCollectionModalClose = () => {
    setIsCollectionModalOpen(false);
    setSelectedCollectionMovieId(null);
  };

  const handleMovieUpdate = () => {
    fetchVault();
  };

  const handleVaultUpdated = () => {
    fetchVault();
    setIsEditModalOpen(false);
  };

  const handleVaultDeleted = () => {
    router.push('/vaults');
  };

  // Filter movies by search query and collection status
  const filteredMovies = vault?.movies.filter((movie) => {
    if (showInCollectionOnly && !movie.in_collection) return false;
    if (!debouncedSearchQuery) return true;
    const query = debouncedSearchQuery.toLowerCase();
    return (
      movie.title.toLowerCase().includes(query) ||
      movie.director?.toLowerCase().includes(query)
    );
  }) || [];

  const inCollectionCount = vault?.movies.filter((m) => m.in_collection).length || 0;

  return (
    <div className="min-h-screen animated-gradient relative gradient-pulse">
      {/* Header */}
      <div
        className={`border-b border-gray-800/50 bg-black/60 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? 'shadow-lg' : 'border-white/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {!isScrolled && (
            <div className="space-y-3 py-3 sm:py-4">
              {/* Navigation */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-between gap-3"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  {navItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link key={item.href} href={item.href}>
                        <motion.div
                          className={cn(
                            'relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all duration-300 min-h-[44px]',
                            isActive ? 'text-black' : 'text-white/70 hover:text-white'
                          )}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 bg-white rounded-xl shadow-lg"
                              layoutId="activeNav"
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
                          )}
                          <IconComponent className="w-4 h-4 relative z-10" />
                          <span className="relative z-10 hidden sm:inline">{item.label}</span>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>

              {/* Vault Info & Controls */}
              <div className="space-y-3">
                {/* Back Button + Vault Name */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.push('/vaults')}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-white">{vault?.name || 'Loading...'}</h1>
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Edit Vault"
                      >
                        <Edit className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    {vault?.description && (
                      <p className="text-sm text-gray-400 mt-1">{vault.description}</p>
                    )}
                  </div>
                  <span className="hidden sm:block text-gray-400 text-sm font-medium px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    {loading
                      ? 'Loading...'
                      : `${filteredMovies.length} ${filteredMovies.length === 1 ? 'film' : 'films'}`}
                  </span>
                  {inCollectionCount > 0 && (
                    <span className="hidden sm:flex items-center gap-2 text-green-400 text-sm font-medium px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                      {inCollectionCount} in collection
                    </span>
                  )}
                </div>

                {/* Search + Filters + Add Button */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <div className="relative flex-1 max-w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search movies..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-white placeholder-gray-400 min-h-[44px]"
                    />
                  </div>

                  <div className="flex gap-2 items-center">
                    {/* In Collection Filter */}
                    {inCollectionCount > 0 && (
                      <button
                        onClick={() => setShowInCollectionOnly(!showInCollectionOnly)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all min-h-[44px]',
                          showInCollectionOnly
                            ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                            : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700'
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="hidden sm:inline">In Collection</span>
                      </button>
                    )}

                    {/* Grid Density */}
                    <div className="hidden lg:flex border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
                      <button
                        onClick={() => setGridColumns(4)}
                        className={`p-3 transition-all min-h-[44px] min-w-[44px] ${
                          gridColumns === 4
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setGridColumns(5)}
                        className={`p-3 transition-all min-h-[44px] min-w-[44px] ${
                          gridColumns === 5
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        <Grid3X3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setGridColumns(6)}
                        className={`p-3 transition-all min-h-[44px] min-w-[44px] ${
                          gridColumns === 6
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        <Grip className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Add Movie Button */}
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all min-h-[44px] shadow-lg hover:shadow-xl"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add Movie</span>
                      <span className="sm:hidden">Add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Movies Grid */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
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
                onClick={() => handleMovieClick(movie)}
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
                    {movie.director && <p className="text-gray-300 text-xs mt-1">{movie.director}</p>}
                  </div>
                  {/* In Collection Badge */}
                  {movie.in_collection && (
                    <div className="absolute top-2 right-2">
                      <div className="w-8 h-8 rounded-full bg-green-500/90 flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No movies in this vault</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || showInCollectionOnly
                ? 'Try adjusting your filters'
                : 'Start adding movies to this vault'}
            </p>
            {!searchQuery && !showInCollectionOnly && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Your First Movie
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {vault && (
        <>
          <AddToVaultModal
            vaultId={vaultId}
            vaultName={vault.name}
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onMovieAdded={handleMovieUpdate}
          />

          {/* For movies in collection - use full MovieDetailsModal */}
          <MovieDetailsModal
            movieId={selectedCollectionMovieId}
            isOpen={isCollectionModalOpen}
            onClose={handleCollectionModalClose}
            onMovieUpdate={handleMovieUpdate}
          />

          {/* For movies NOT in collection - use VaultMovieModal */}
          <VaultMovieModal
            movie={selectedMovie}
            vaultId={vaultId}
            isOpen={isMovieModalOpen}
            onClose={handleMovieModalClose}
            onMovieRemoved={handleMovieUpdate}
          />

          <EditVaultModal
            vault={vault}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onVaultUpdated={handleVaultUpdated}
            onVaultDeleted={handleVaultDeleted}
          />
        </>
      )}
    </div>
  );
}
