/**
 * Movie Helper Utilities
 * Provides helper functions for working with movie data
 */

import { DEFAULTS } from './constants';

/**
 * Format a movie release date to just the year
 * @param date - Date string, Date object, or null
 * @returns Formatted year string, or empty string if null
 */
export function formatMovieYear(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  return dateObj.getFullYear().toString();
}

/**
 * Format a runtime in minutes to hours and minutes
 * @param runtime - Runtime in minutes
 * @returns Formatted string like "2h 30m"
 */
export function formatRuntime(runtime: number | null | undefined): string {
  if (!runtime) return '';

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

/**
 * Format a movie rating to one decimal place
 * @param rating - Rating value (0-10 scale)
 * @returns Formatted rating string
 */
export function formatRating(rating: number | null | undefined): string {
  if (!rating) return '—';
  return rating.toFixed(1);
}

/**
 * Calculate confidence score for movie matches
 * Based on title similarity, year match, and director match
 */
export interface MatchConfidence {
  score: number; // 0-100
  isLowConfidence: boolean;
  reasons: string[];
}

export function calculateMatchConfidence(
  searchTitle: string,
  matchedTitle: string,
  searchYear?: number | null,
  matchedYear?: number | null,
  searchDirector?: string | null,
  matchedDirector?: string | null
): MatchConfidence {
  let score = 0;
  const reasons: string[] = [];

  // Title match (0-60 points)
  const titleSimilarity = calculateStringSimilarity(
    searchTitle.toLowerCase(),
    matchedTitle.toLowerCase()
  );
  const titleScore = Math.round(titleSimilarity * 60);
  score += titleScore;

  if (titleScore < 40) {
    reasons.push('Title mismatch');
  }

  // Year match (0-20 points)
  if (searchYear && matchedYear) {
    const yearDiff = Math.abs(searchYear - matchedYear);
    if (yearDiff === 0) {
      score += 20;
    } else if (yearDiff === 1) {
      score += 15;
      reasons.push('Year off by 1');
    } else {
      reasons.push(`Year mismatch (${yearDiff} years)`);
    }
  }

  // Director match (0-20 points)
  if (searchDirector && matchedDirector) {
    const directorSimilarity = calculateStringSimilarity(
      searchDirector.toLowerCase(),
      matchedDirector.toLowerCase()
    );
    const directorScore = Math.round(directorSimilarity * 20);
    score += directorScore;

    if (directorScore < 15) {
      reasons.push('Director mismatch');
    }
  }

  return {
    score,
    isLowConfidence: score < 70,
    reasons,
  };
}

/**
 * Simple string similarity calculation using Levenshtein distance
 * @returns Similarity score between 0 and 1
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Get Oscar badges for display
 */
export interface OscarBadges {
  wins: number;
  nominations: number;
  categories: string[];
}

export function getOscarBadges(oscarData: Array<{ category: string; is_winner: boolean }>): OscarBadges {
  const wins = oscarData.filter(d => d.is_winner).length;
  const nominations = oscarData.length;
  const categories = [...new Set(oscarData.map(d => d.category))];

  return { wins, nominations, categories };
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Get aspect ratio for movie posters
 */
export function getPosterAspectRatio(): number {
  return DEFAULTS.POSTER_ASPECT_RATIO;
}

/**
 * Get aspect ratio for movie backdrops
 */
export function getBackdropAspectRatio(): number {
  return DEFAULTS.BACKDROP_ASPECT_RATIO;
}

/**
 * Format a date to locale string
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date to short format (MM/DD/YYYY)
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toLocaleDateString('en-US');
}
