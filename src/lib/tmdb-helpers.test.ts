import { describe, it, expect } from 'vitest';
import {
  getTMDBImageURL,
  getPosterURL,
  getBackdropURL,
  getTMDBApiURL,
  getPosterURLWithFallback,
  getBackdropURLWithFallback,
  FALLBACK_POSTER,
  FALLBACK_BACKDROP,
} from './tmdb-helpers';

describe('TMDB Helpers', () => {
  describe('getTMDBImageURL', () => {
    it('should return null for null path', () => {
      expect(getTMDBImageURL(null, 'poster', 'medium')).toBeNull();
    });

    it('should build poster URLs correctly', () => {
      const path = '/abc123.jpg';

      expect(getTMDBImageURL(path, 'poster', 'small')).toBe('https://image.tmdb.org/t/p/w200/abc123.jpg');
      expect(getTMDBImageURL(path, 'poster', 'medium')).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
      expect(getTMDBImageURL(path, 'poster', 'large')).toBe('https://image.tmdb.org/t/p/original/abc123.jpg');
    });

    it('should build backdrop URLs correctly', () => {
      const path = '/xyz789.jpg';

      expect(getTMDBImageURL(path, 'backdrop', 'small')).toBe('https://image.tmdb.org/t/p/w300/xyz789.jpg');
      expect(getTMDBImageURL(path, 'backdrop', 'medium')).toBe('https://image.tmdb.org/t/p/w780/xyz789.jpg');
      expect(getTMDBImageURL(path, 'backdrop', 'large')).toBe('https://image.tmdb.org/t/p/w1280/xyz789.jpg');
      expect(getTMDBImageURL(path, 'backdrop', 'original')).toBe('https://image.tmdb.org/t/p/original/xyz789.jpg');
    });

    it('should default to medium size', () => {
      const path = '/test.jpg';
      expect(getTMDBImageURL(path, 'poster')).toBe('https://image.tmdb.org/t/p/w500/test.jpg');
    });
  });

  describe('getPosterURL', () => {
    it('should return correct poster URL', () => {
      expect(getPosterURL('/test.jpg', 'medium')).toBe('https://image.tmdb.org/t/p/w500/test.jpg');
    });

    it('should return null for null path', () => {
      expect(getPosterURL(null)).toBeNull();
    });
  });

  describe('getBackdropURL', () => {
    it('should return correct backdrop URL', () => {
      expect(getBackdropURL('/test.jpg', 'large')).toBe('https://image.tmdb.org/t/p/w1280/test.jpg');
    });

    it('should return null for null path', () => {
      expect(getBackdropURL(null)).toBeNull();
    });
  });

  describe('getTMDBApiURL', () => {
    it('should build API URLs correctly', () => {
      expect(getTMDBApiURL('/movie/123')).toBe('https://api.themoviedb.org/3/movie/123');
      expect(getTMDBApiURL('/search/movie')).toBe('https://api.themoviedb.org/3/search/movie');
    });
  });

  describe('getPosterURLWithFallback', () => {
    it('should return TMDB URL when path exists', () => {
      expect(getPosterURLWithFallback('/test.jpg')).toBe('https://image.tmdb.org/t/p/w500/test.jpg');
    });

    it('should return fallback when path is null', () => {
      expect(getPosterURLWithFallback(null)).toBe(FALLBACK_POSTER);
    });
  });

  describe('getBackdropURLWithFallback', () => {
    it('should return TMDB URL when path exists', () => {
      expect(getBackdropURLWithFallback('/test.jpg')).toBe('https://image.tmdb.org/t/p/w780/test.jpg');
    });

    it('should return fallback when path is null', () => {
      expect(getBackdropURLWithFallback(null)).toBe(FALLBACK_BACKDROP);
    });
  });
});
