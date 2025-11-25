/**
 * TMDB Helper Utilities
 * Provides helper functions for working with TMDB API and image URLs
 */

import { TMDB_BASE_URL, TMDB_IMAGE_SIZES } from './constants';

/**
 * Builds a full TMDB image URL from a path and size
 * @param path - The image path from TMDB (e.g., "/abc123.jpg")
 * @param type - The type of image (poster or backdrop)
 * @param size - The size variant to use
 * @returns The full image URL, or null if path is null
 */
export function getTMDBImageURL(
  path: string | null,
  type: 'poster' | 'backdrop',
  size: 'small' | 'medium' | 'large' | 'original' = 'medium'
): string | null {
  if (!path) return null;

  const sizeMap = type === 'poster' ? TMDB_IMAGE_SIZES.POSTER : TMDB_IMAGE_SIZES.BACKDROP;
  let sizeKey: string;

  switch (size) {
    case 'small':
      sizeKey = sizeMap.SMALL;
      break;
    case 'large':
      sizeKey = sizeMap.LARGE;
      break;
    case 'original':
      sizeKey = type === 'backdrop' ? TMDB_IMAGE_SIZES.BACKDROP.ORIGINAL : TMDB_IMAGE_SIZES.POSTER.LARGE;
      break;
    case 'medium':
    default:
      sizeKey = sizeMap.MEDIUM;
  }

  return `${TMDB_BASE_URL.IMAGE}/${sizeKey}${path}`;
}

/**
 * Get poster URL with specific size
 */
export function getPosterURL(path: string | null, size: 'small' | 'medium' | 'large' = 'medium'): string | null {
  return getTMDBImageURL(path, 'poster', size);
}

/**
 * Get backdrop URL with specific size
 */
export function getBackdropURL(path: string | null, size: 'small' | 'medium' | 'large' = 'medium'): string | null {
  return getTMDBImageURL(path, 'backdrop', size);
}

/**
 * Get the TMDB API endpoint URL
 * @param path - The API path (e.g., "/movie/123")
 * @returns The full API URL
 */
export function getTMDBApiURL(path: string): string {
  return `${TMDB_BASE_URL.API}${path}`;
}

/**
 * Fallback poster image for movies without posters
 */
export const FALLBACK_POSTER = '/placeholder-poster.png';

/**
 * Fallback backdrop image for movies without backdrops
 */
export const FALLBACK_BACKDROP = '/placeholder-backdrop.png';

/**
 * Get poster URL with fallback
 */
export function getPosterURLWithFallback(path: string | null, size: 'small' | 'medium' | 'large' = 'medium'): string {
  return getPosterURL(path, size) || FALLBACK_POSTER;
}

/**
 * Get backdrop URL with fallback
 */
export function getBackdropURLWithFallback(path: string | null, size: 'small' | 'medium' | 'large' = 'medium'): string {
  return getBackdropURL(path, size) || FALLBACK_BACKDROP;
}
