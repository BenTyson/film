'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Award, Users, Clapperboard, Film, Archive } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { VaultCard } from '@/components/vault/VaultCard';
import { CreateVaultModal } from '@/components/vault/CreateVaultModal';
import { EditVaultModal } from '@/components/vault/EditVaultModal';
import type { VaultWithCount, Vault } from '@/types/vault';

const navItems = [
  { href: '/', label: 'Collection', icon: Clapperboard },
  { href: '/oscars', label: 'Oscars', icon: Award },
  { href: '/buddy/calen', label: 'Calen', icon: Users },
  { href: '/watchlist', label: 'Watchlist', icon: Film },
  { href: '/vaults', label: 'Vaults', icon: Archive },
  { href: '/add', label: 'Add', icon: Plus },
];

export default function VaultsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [vaults, setVaults] = useState<VaultWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVault] = useState<Vault | null>(null);
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

  const fetchVaults = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vaults');
      const data = await response.json();

      if (data.success) {
        setVaults(data.data);
      }
    } catch (error) {
      console.error('Error fetching vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaults();
  }, []);

  const handleVaultClick = (vaultId: number) => {
    router.push(`/vaults/${vaultId}`);
  };

  const handleVaultCreated = () => {
    fetchVaults();
  };

  const handleVaultUpdated = () => {
    fetchVaults();
    setIsEditModalOpen(false);
  };

  const handleVaultDeleted = () => {
    fetchVaults();
    setIsEditModalOpen(false);
  };


  // Filter vaults by search query
  const filteredVaults = vaults.filter((vault) => {
    if (!debouncedSearchQuery) return true;
    const query = debouncedSearchQuery.toLowerCase();
    return (
      vault.name.toLowerCase().includes(query) ||
      vault.description?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen animated-gradient relative gradient-pulse">
      {/* Unified Navigation + Controls Header */}
      <div
        className={`border-b border-gray-800/50 bg-black/60 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? 'shadow-lg' : 'border-white/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Normal State: Two Rows - Clean and Efficient */}
          {!isScrolled && (
            <div className="space-y-3 py-3 sm:py-4">
              {/* Row 1: Navigation + Vault Count */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-between gap-3"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
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

                {/* Vault Count */}
                <span className="hidden sm:block text-gray-400 text-sm font-medium px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50 whitespace-nowrap">
                  {loading
                    ? 'Loading...'
                    : searchQuery
                    ? `${filteredVaults.length} of ${vaults.length} found`
                    : `${vaults.length} ${vaults.length === 1 ? 'vault' : 'vaults'}`}
                </span>
              </motion.div>

              {/* Row 2: Search + Create Button */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                {/* Search */}
                <div className="relative flex-1 max-w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search vaults..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-white placeholder-gray-400 min-h-[44px]"
                  />
                </div>

                {/* Create Vault Button */}
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all min-h-[44px] shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Vault</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
        {/* Vaults Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : filteredVaults.length > 0 ? (
          <div className="grid gap-6 mb-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredVaults.map((vault) => (
              <VaultCard
                key={vault.id}
                vault={vault}
                onClick={() => handleVaultClick(vault.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Archive className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {searchQuery ? 'No vaults found' : 'No vaults yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first vault to organize your favorite films'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Your First Vault
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateVaultModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onVaultCreated={handleVaultCreated}
      />

      <EditVaultModal
        vault={selectedVault}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onVaultUpdated={handleVaultUpdated}
        onVaultDeleted={handleVaultDeleted}
      />
    </div>
  );
}
