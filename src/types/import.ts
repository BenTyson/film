/**
 * CSV Import Type Definitions
 */

import { TMDBSearchResult } from './tmdb';

/**
 * Raw CSV row data
 */
export interface CSVRow {
  [key: string]: string | number | null | undefined;
  Title?: string;
  Year?: string;
  Director?: string;
  'Date Watched'?: string;
  Rating?: string | number;
  Notes?: string;
}

/**
 * Parsed movie from CSV
 */
export interface ParsedMovie {
  title: string;
  year: number | null;
  director: string | null;
  dateWatched: string | null;
  rating: number | null;
  notes: string | null;
  rowNumber: number;
}

/**
 * TMDB match result for import
 */
export interface TMDBMatchResult {
  tmdb_id: number;
  title: string;
  release_date: string | null;
  director: string | null;
  poster_path: string | null;
  confidence: number;
  matchedBy: 'exact' | 'fuzzy' | 'manual';
}

/**
 * Import movie with match
 */
export interface ImportMovie extends ParsedMovie {
  tmdbMatch?: TMDBMatchResult;
  tmdbSearchResults?: TMDBSearchResult[];
  status: 'pending' | 'matched' | 'failed' | 'imported';
  error?: string;
}

/**
 * Failed movie import
 */
export interface FailedMovie extends ParsedMovie {
  error: string;
  tmdbSearchResults?: TMDBSearchResult[];
}

/**
 * Import statistics
 */
export interface ImportStats {
  total: number;
  matched: number;
  failed: number;
  imported: number;
  pending: number;
}

/**
 * Import session
 */
export interface ImportSession {
  id: string;
  fileName: string;
  uploadedAt: Date;
  stats: ImportStats;
  movies: ImportMovie[];
}
