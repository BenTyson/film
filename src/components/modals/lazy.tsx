'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Loading spinner for modal lazy loading
const ModalLoader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      <span className="text-sm text-gray-400">Loading...</span>
    </div>
  </div>
);

// Vault modals
export const LazyCreateVaultModal = dynamic(
  () => import('@/components/vault/CreateVaultModal').then(mod => ({ default: mod.CreateVaultModal })),
  { loading: ModalLoader, ssr: false }
);

export const LazyEditVaultModal = dynamic(
  () => import('@/components/vault/EditVaultModal').then(mod => ({ default: mod.EditVaultModal })),
  { loading: ModalLoader, ssr: false }
);

export const LazyVaultMovieModal = dynamic(
  () => import('@/components/vault/VaultMovieModal').then(mod => ({ default: mod.VaultMovieModal })),
  { loading: ModalLoader, ssr: false }
);

export const LazyAddToVaultModal = dynamic(
  () => import('@/components/vault/AddToVaultModal').then(mod => ({ default: mod.AddToVaultModal })),
  { loading: ModalLoader, ssr: false }
);

// Watchlist modals
export const LazyWatchlistMovieModal = dynamic(
  () => import('@/components/watchlist/WatchlistMovieModal').then(mod => ({ default: mod.WatchlistMovieModal })),
  { loading: ModalLoader, ssr: false }
);

export const LazyAddToWatchlistModal = dynamic(
  () => import('@/components/watchlist/AddToWatchlistModal').then(mod => ({ default: mod.AddToWatchlistModal })),
  { loading: ModalLoader, ssr: false }
);

// Movie modals
export const LazyMovieDetailsModal = dynamic(
  () => import('@/components/movie/MovieDetailsModal').then(mod => ({ default: mod.MovieDetailsModal })),
  { loading: ModalLoader, ssr: false }
);

export const LazyAddToCalenModal = dynamic(
  () => import('@/components/movie/AddToCalenModal').then(mod => ({ default: mod.AddToCalenModal })),
  { loading: ModalLoader, ssr: false }
);

export const LazyFixMovieModal = dynamic(
  () => import('@/components/movie/FixMovieModal').then(mod => ({ default: mod.FixMovieModal })),
  { loading: ModalLoader, ssr: false }
);

// Oscar modals
export const LazyEditOscarMovieModal = dynamic(
  () => import('@/components/oscar/EditOscarMovieModal').then(mod => ({ default: mod.EditOscarMovieModal })),
  { loading: ModalLoader, ssr: false }
);

// Admin modals
export const LazyEditUserModal = dynamic(
  () => import('@/components/admin/EditUserModal').then(mod => ({ default: mod.EditUserModal })),
  { loading: ModalLoader, ssr: false }
);
