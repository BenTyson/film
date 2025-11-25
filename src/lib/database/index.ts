/**
 * Database Query Helpers
 * Centralized exports for all database query utilities
 */

// Movie queries
export {
  movieInclude,
  movieListInclude,
  userMoviesWhere,
  buildMovieFilters,
  buildMovieOrderBy,
  transformToGridItem,
  getUserMovies,
  getMovieById,
  getAvailableYears,
  getMovieStats,
  type MovieFilterParams,
  type SortField,
  type SortOrder,
  type MovieGridItem,
} from './movie-queries';

// Tag queries
export {
  getOrCreateTags,
  setMovieTags,
  addMovieTags,
  removeMovieTags,
  getUserTags,
  getTagStats,
  batchSetMovieTags,
  type TagData,
} from './tag-queries';
