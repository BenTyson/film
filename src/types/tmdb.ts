/**
 * TMDB API Type Definitions
 * Types for TMDB API responses and data structures
 */

/**
 * Genre from TMDB
 */
export interface TMDBGenre {
  id: number;
  name: string;
}

/**
 * Production company from TMDB
 */
export interface TMDBProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

/**
 * Production country from TMDB
 */
export interface TMDBProductionCountry {
  iso_3166_1: string;
  name: string;
}

/**
 * Spoken language from TMDB
 */
export interface TMDBSpokenLanguage {
  iso_639_1: string;
  name: string;
  english_name: string;
}

/**
 * TMDB movie search result
 */
export interface TMDBSearchResult {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  genre_ids: number[];
  original_language: string;
  original_title: string;
  video: boolean;
}

/**
 * Enhanced TMDB search result with additional data from our API
 * Includes director and full genre objects fetched from TMDB details
 */
export interface TMDBEnhancedSearchResult extends TMDBSearchResult {
  director?: string | null;
  runtime?: number | null;
  genres?: TMDBGenre[];
  imdb_id?: string | null;
}

/**
 * Complete TMDB movie details
 */
export interface TMDBMovieDetails {
  id: number;
  imdb_id: string | null;
  title: string;
  original_title: string;
  tagline: string | null;
  overview: string | null;
  release_date: string | null;
  runtime: number | null;
  budget: number;
  revenue: number;
  status: string;
  adult: boolean;
  backdrop_path: string | null;
  poster_path: string | null;
  homepage: string | null;
  original_language: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  video: boolean;
  genres: TMDBGenre[];
  production_companies: TMDBProductionCompany[];
  production_countries: TMDBProductionCountry[];
  spoken_languages: TMDBSpokenLanguage[];
}

/**
 * TMDB credits (cast and crew)
 */
export interface TMDBCast {
  id: number;
  cast_id: number;
  credit_id: string;
  name: string;
  character: string;
  gender: number;
  order: number;
  profile_path: string | null;
}

export interface TMDBCrew {
  id: number;
  credit_id: string;
  name: string;
  department: string;
  job: string;
  gender: number;
  profile_path: string | null;
}

export interface TMDBCredits {
  id: number;
  cast: TMDBCast[];
  crew: TMDBCrew[];
}

/**
 * TMDB video (trailer, teaser, etc.)
 */
export interface TMDBVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
}

/**
 * TMDB watch provider
 */
export interface TMDBWatchProvider {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface TMDBWatchProviderData {
  link: string;
  flatrate?: TMDBWatchProvider[];
  rent?: TMDBWatchProvider[];
  buy?: TMDBWatchProvider[];
}

export interface TMDBWatchProviders {
  id: number;
  results: {
    [countryCode: string]: TMDBWatchProviderData;
  };
}

/**
 * TMDB API search response
 */
export interface TMDBSearchResponse {
  page: number;
  results: TMDBSearchResult[];
  total_pages: number;
  total_results: number;
}

/**
 * TMDB API error response
 */
export interface TMDBErrorResponse {
  success: false;
  status_code: number;
  status_message: string;
}

/**
 * Type guard for TMDB error
 */
export function isTMDBError(response: unknown): response is TMDBErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === false &&
    'status_message' in response
  );
}

/**
 * TMDB image configuration
 */
export interface TMDBImageConfig {
  base_url: string;
  secure_base_url: string;
  backdrop_sizes: string[];
  logo_sizes: string[];
  poster_sizes: string[];
  profile_sizes: string[];
  still_sizes: string[];
}

/**
 * TMDB configuration
 */
export interface TMDBConfiguration {
  images: TMDBImageConfig;
  change_keys: string[];
}
