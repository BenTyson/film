import { describe, it, expect } from 'vitest';
import {
  APPROVAL_STATUS,
  API_ENDPOINTS,
  ROUTES,
  TMDB_BASE_URL,
  TMDB_IMAGE_SIZES,
  SORT_FIELDS,
  HTTP_STATUS,
  type ApprovalStatus,
  type SortField,
} from './index';

describe('Constants', () => {
  describe('APPROVAL_STATUS', () => {
    it('should have correct values', () => {
      expect(APPROVAL_STATUS.APPROVED).toBe('approved');
      expect(APPROVAL_STATUS.PENDING).toBe('pending');
      expect(APPROVAL_STATUS.REMOVED).toBe('removed');
    });

    it('should be type-safe', () => {
      const status: ApprovalStatus = APPROVAL_STATUS.APPROVED;
      expect(status).toBeDefined();
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should have correct static endpoints', () => {
      expect(API_ENDPOINTS.MOVIES).toBe('/api/movies');
      expect(API_ENDPOINTS.OSCARS).toBe('/api/oscars');
      expect(API_ENDPOINTS.WATCHLIST).toBe('/api/watchlist');
    });

    it('should generate dynamic endpoints correctly', () => {
      expect(API_ENDPOINTS.MOVIE_BY_ID(123)).toBe('/api/movies/123');
      expect(API_ENDPOINTS.VAULT_BY_ID(456)).toBe('/api/vaults/456');
      expect(API_ENDPOINTS.TMDB_MOVIE(789)).toBe('/api/tmdb/movie/789');
    });
  });

  describe('ROUTES', () => {
    it('should generate routes correctly', () => {
      expect(ROUTES.HOME).toBe('/');
      expect(ROUTES.MOVIE_DETAIL(123)).toBe('/movies/123');
      expect(ROUTES.MOVIE_DETAIL(123, 'collection')).toBe('/movies/123?from=collection');
      expect(ROUTES.OSCAR_YEAR(2024)).toBe('/oscars/2024');
    });
  });

  describe('TMDB Configuration', () => {
    it('should have correct base URLs', () => {
      expect(TMDB_BASE_URL.IMAGE).toBe('https://image.tmdb.org/t/p');
      expect(TMDB_BASE_URL.API).toBe('https://api.themoviedb.org/3');
    });

    it('should have correct image sizes', () => {
      expect(TMDB_IMAGE_SIZES.POSTER.SMALL).toBe('w200');
      expect(TMDB_IMAGE_SIZES.POSTER.MEDIUM).toBe('w500');
      expect(TMDB_IMAGE_SIZES.BACKDROP.LARGE).toBe('w1280');
    });
  });

  describe('SORT_FIELDS', () => {
    it('should have correct field names', () => {
      expect(SORT_FIELDS.DATE_WATCHED).toBe('date_watched');
      expect(SORT_FIELDS.TITLE).toBe('title');
      expect(SORT_FIELDS.PERSONAL_RATING).toBe('personal_rating');
    });

    it('should be type-safe', () => {
      const field: SortField = SORT_FIELDS.DATE_WATCHED;
      expect(field).toBeDefined();
    });
  });

  describe('HTTP_STATUS', () => {
    it('should have correct status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });
});
