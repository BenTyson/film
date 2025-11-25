/**
 * Application-wide constants
 * Provides type-safe access to commonly used values throughout the app
 */

// ============================================================================
// Approval Statuses
// ============================================================================

export const APPROVAL_STATUS = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REMOVED: 'removed',
} as const;

export type ApprovalStatus = typeof APPROVAL_STATUS[keyof typeof APPROVAL_STATUS];

// ============================================================================
// User Roles
// ============================================================================

export const USER_ROLE = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

// ============================================================================
// Special Tags
// ============================================================================

export const SPECIAL_TAGS = {
  FAVORITES: 'favorites',
  OSCAR_WINNERS: 'oscar-winners',
  RECENT: 'recent',
  LOW_CONFIDENCE: 'low-confidence',
} as const;

export type SpecialTag = typeof SPECIAL_TAGS[keyof typeof SPECIAL_TAGS];

// ============================================================================
// Buddy Names (for backward compatibility)
// ============================================================================

export const BUDDY_NAMES = {
  CALEN: 'Calen',
  SOLO: 'Solo',
  FAMILY: 'Family',
} as const;

// ============================================================================
// Sort Fields
// ============================================================================

export const SORT_FIELDS = {
  DATE_WATCHED: 'date_watched',
  TITLE: 'title',
  RELEASE_DATE: 'release_date',
  PERSONAL_RATING: 'personal_rating',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
} as const;

export type SortField = typeof SORT_FIELDS[keyof typeof SORT_FIELDS];

// ============================================================================
// Sort Orders
// ============================================================================

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrder = typeof SORT_ORDER[keyof typeof SORT_ORDER];

// ============================================================================
// View Modes
// ============================================================================

export const VIEW_MODE = {
  GRID: 'grid',
  LIST: 'list',
} as const;

export type ViewMode = typeof VIEW_MODE[keyof typeof VIEW_MODE];

// ============================================================================
// API Endpoints
// ============================================================================

export const API_ENDPOINTS = {
  // Movies
  MOVIES: '/api/movies',
  MOVIE_BY_ID: (id: number) => `/api/movies/${id}`,
  MOVIE_REMOVE: (id: number) => `/api/movies/${id}/remove`,
  MOVIE_TAGS: (id: number) => `/api/movies/${id}/tags`,
  MOVIE_UPDATE_TMDB: (id: number) => `/api/movies/${id}/update-tmdb`,
  MOVIES_YEARS: '/api/movies/years',
  MOVIES_STATS: '/api/movies/stats',
  SEARCH_MOVIES: '/api/search',

  // Oscar
  OSCARS: '/api/oscars',
  OSCAR_YEARS: '/api/oscars/years',
  OSCAR_CATEGORIES: '/api/oscars/categories',
  OSCAR_NOMINATIONS: '/api/oscars/nominations',
  OSCAR_TABLE: '/api/oscars/table',
  OSCAR_VERIFY: '/api/oscars/verify',

  // Watchlist
  WATCHLIST: '/api/watchlist',
  WATCHLIST_BY_ID: (id: number) => `/api/watchlist/${id}`,

  // Vaults
  VAULTS: '/api/vaults',
  VAULT_BY_ID: (id: number) => `/api/vaults/${id}`,
  VAULT_MOVIES: (vaultId: number) => `/api/vaults/${vaultId}/movies`,
  VAULT_MOVIE: (vaultId: number, movieId: number) => `/api/vaults/${vaultId}/movies/${movieId}`,

  // Tags
  TAGS: '/api/tags',

  // Buddies
  BUDDIES: '/api/buddies',

  // TMDB
  TMDB_SEARCH: '/api/tmdb/search',
  TMDB_MOVIE: (tmdbId: number) => `/api/tmdb/movie/${tmdbId}`,
  TMDB_WATCH_PROVIDERS: (tmdbId: number) => `/api/tmdb/watch-providers/${tmdbId}`,
  TMDB_TRAILER: (tmdbId: number) => `/api/tmdb/trailer/${tmdbId}`,

  // Admin
  ADMIN_USERS: '/api/admin/users',
  ADMIN_ACTIVITY: '/api/admin/activity',
  ADMIN_ERRORS: '/api/admin/errors',

  // Import
  IMPORT_CSV: '/api/import/csv',
  IMPORT_ANALYZE: '/api/import/analyze',
  IMPORT_CONFIRM: '/api/import/confirm',

  // User
  USER: '/api/user',

  // Search
  SEARCH: '/api/search',
} as const;

// ============================================================================
// Page Routes
// ============================================================================

export const ROUTES = {
  HOME: '/',
  MOVIE_DETAIL: (id: number, from?: string) =>
    from ? `/movies/${id}?from=${from}` : `/movies/${id}`,
  OSCARS: '/oscars',
  OSCAR_YEAR: (year: number) => `/oscars/${year}`,
  WATCHLIST: '/watchlist',
  VAULTS: '/vaults',
  VAULT_DETAIL: (id: number) => `/vaults/${id}`,
  BUDDY_CALEN: '/buddy/calen',
  ADD_MOVIE: '/add-movie',
  IMPORT: '/import',
  ADMIN: '/admin',
} as const;

// ============================================================================
// Context Types (for navigation)
// ============================================================================

export const NAVIGATION_CONTEXT = {
  COLLECTION: 'collection',
  OSCARS: 'oscars',
  WATCHLIST: 'watchlist',
  VAULT: 'vault',
} as const;

export type NavigationContext = typeof NAVIGATION_CONTEXT[keyof typeof NAVIGATION_CONTEXT];

// ============================================================================
// TMDB Configuration
// ============================================================================

export const TMDB_IMAGE_SIZES = {
  POSTER: {
    SMALL: 'w200',
    MEDIUM: 'w500',
    LARGE: 'original',
  },
  BACKDROP: {
    SMALL: 'w300',
    MEDIUM: 'w780',
    LARGE: 'w1280',
    ORIGINAL: 'original',
  },
} as const;

export const TMDB_BASE_URL = {
  IMAGE: 'https://image.tmdb.org/t/p',
  API: 'https://api.themoviedb.org/3',
} as const;

// ============================================================================
// Activity Log Action Types
// ============================================================================

export const ACTIVITY_ACTION = {
  MOVIE_ADDED: 'movie_added',
  MOVIE_UPDATED: 'movie_updated',
  MOVIE_DELETED: 'movie_deleted',
  CSV_IMPORT: 'csv_import',
  VAULT_CREATED: 'vault_created',
  VAULT_UPDATED: 'vault_updated',
  VAULT_DELETED: 'vault_deleted',
  WATCHLIST_ADDED: 'watchlist_added',
  WATCHLIST_REMOVED: 'watchlist_removed',
  TAG_CREATED: 'tag_created',
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  OSCAR_VERIFIED: 'oscar_verified',
  OSCAR_UPDATED: 'oscar_updated',
  LOGIN: 'login',
} as const;

export type ActivityAction = typeof ACTIVITY_ACTION[keyof typeof ACTIVITY_ACTION];

// ============================================================================
// Activity Log Target Types
// ============================================================================

export const ACTIVITY_TARGET = {
  MOVIE: 'movie',
  VAULT: 'vault',
  WATCHLIST: 'watchlist',
  TAG: 'tag',
  USER: 'user',
  OSCAR: 'oscar',
  IMPORT: 'import',
} as const;

export type ActivityTarget = typeof ACTIVITY_TARGET[keyof typeof ACTIVITY_TARGET];

// ============================================================================
// Pagination
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  INFINITE_SCROLL_THRESHOLD: 0.8, // 80% scroll triggers load
} as const;

// ============================================================================
// Search Configuration
// ============================================================================

export const SEARCH_CONFIG = {
  DEBOUNCE_MS: 300,
  MIN_QUERY_LENGTH: 2,
  MAX_RESULTS: 50,
} as const;

// ============================================================================
// Oscar Categories
// ============================================================================

export const OSCAR_CATEGORY = {
  BEST_PICTURE: 'Best Picture',
  BEST_DIRECTOR: 'Best Director',
  BEST_ACTOR: 'Best Actor',
  BEST_ACTRESS: 'Best Actress',
  BEST_SUPPORTING_ACTOR: 'Best Supporting Actor',
  BEST_SUPPORTING_ACTRESS: 'Best Supporting Actress',
} as const;

export type OscarCategory = typeof OSCAR_CATEGORY[keyof typeof OSCAR_CATEGORY];

// ============================================================================
// HTTP Status Codes
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGE = {
  UNAUTHORIZED: 'You must be logged in to perform this action',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'Resource not found',
  MOVIE_NOT_FOUND: 'Movie not found',
  VAULT_NOT_FOUND: 'Vault not found',
  WATCHLIST_NOT_FOUND: 'Watchlist item not found',
  USER_NOT_FOUND: 'User not found',
  INVALID_INPUT: 'Invalid input provided',
  DATABASE_ERROR: 'Database error occurred',
  TMDB_ERROR: 'Error fetching data from TMDB',
  ALREADY_EXISTS: 'Resource already exists',
} as const;

// ============================================================================
// Local Storage Keys
// ============================================================================

export const LOCAL_STORAGE_KEYS = {
  VIEW_MODE: 'film_view_mode',
  GRID_COLUMNS: 'film_grid_columns',
  SORT_PREFERENCES: 'film_sort_preferences',
  THEME: 'film_theme',
} as const;

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULTS = {
  GRID_COLUMNS: 5,
  RATING_SCALE: 10,
  POSTER_ASPECT_RATIO: 2 / 3, // Standard movie poster ratio
  BACKDROP_ASPECT_RATIO: 16 / 9,
} as const;
