/**
 * Services Index
 * Centralized exports for all service modules
 */

// Movie Service
export {
  getMovieDetails,
  updateMovie,
  addMovie,
  addMovieFromTMDB,
  removeMovie,
  toggleFavorite,
  updateRating,
  updateNotes,
  updateTMDBAssociation,
  searchLocalMovies,
  getYearCounts,
} from './movieService';

export type {
  MovieDetails,
  UpdateMovieInput,
  CreateMovieInput,
  MovieServiceResult,
} from './movieService';

// TMDB Service
export {
  searchTMDB,
  getTMDBMovie,
  getWatchProviders,
  getTrailer,
  buildYouTubeEmbedUrl,
  buildYouTubeWatchUrl,
} from './tmdbService';

export type {
  WatchProvider,
  WatchProviderData,
  TrailerData,
  TMDBServiceResult,
} from './tmdbService';

// Tag Service
export {
  getTags,
  createTag,
  addTagsToMovie,
  removeTagsFromMovie,
  setMovieTags,
  filterMoodTags,
} from './tagService';

export type {
  Tag,
  CreateTagInput,
  TagServiceResult,
} from './tagService';

// Watchlist Service
export {
  getWatchlistMovies,
  getWatchlistMovie,
  addToWatchlist,
  addToWatchlistFromTMDB,
  updateWatchlistTags,
  removeFromWatchlist,
  isInWatchlist,
} from './watchlistService';

export type {
  WatchlistMovie,
  WatchlistTag,
  AddToWatchlistInput,
  WatchlistServiceResult,
} from './watchlistService';

// Vault Service
export {
  getVaults,
  getVault,
  createVault,
  updateVault,
  deleteVault,
  addToVault,
  addToVaultFromTMDB,
  removeFromVault,
  isInVault,
} from './vaultService';

export type {
  Vault,
  VaultMovie,
  CreateVaultInput,
  UpdateVaultInput,
  AddToVaultInput,
  VaultServiceResult,
} from './vaultService';
