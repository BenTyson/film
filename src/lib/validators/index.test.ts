import { describe, it, expect } from 'vitest';
import {
  movieFilterSchema,
  createMovieSchema,
  updateUserMovieSchema,
  createVaultSchema,
  createTagSchema,
  tmdbSearchSchema,
  paginationSchema,
  formatZodErrors,
} from './index';
import { z } from 'zod';

describe('Validation Schemas', () => {
  describe('paginationSchema', () => {
    it('should validate correct pagination', () => {
      const result = paginationSchema.safeParse({ page: 2, limit: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should use default values', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should coerce string values', () => {
      const result = paginationSchema.safeParse({ page: '3', limit: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(25);
      }
    });

    it('should reject negative values', () => {
      const result = paginationSchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const result = paginationSchema.safeParse({ limit: 200 });
      expect(result.success).toBe(false);
    });
  });

  describe('movieFilterSchema', () => {
    it('should validate movie filters', () => {
      const result = movieFilterSchema.safeParse({
        search: 'Oppenheimer',
        year: 2023,
        favorites: true,
        page: 1,
        limit: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe('Oppenheimer');
        expect(result.data.year).toBe(2023);
        expect(result.data.favorites).toBe(true);
      }
    });

    it('should validate oscar status', () => {
      const result = movieFilterSchema.safeParse({
        oscarStatus: 'won',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.oscarStatus).toBe('won');
      }
    });

    it('should reject invalid oscar status', () => {
      const result = movieFilterSchema.safeParse({
        oscarStatus: 'invalid',
      });

      expect(result.success).toBe(false);
    });

    it('should reject year before 1900', () => {
      const result = movieFilterSchema.safeParse({
        year: 1800,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createMovieSchema', () => {
    it('should validate movie creation', () => {
      const result = createMovieSchema.safeParse({
        tmdb_id: 12345,
        title: 'Test Movie',
        director: 'Test Director',
        release_date: '2024-01-15T00:00:00Z',
      });

      expect(result.success).toBe(true);
    });

    it('should require tmdb_id', () => {
      const result = createMovieSchema.safeParse({
        title: 'Test Movie',
      });

      expect(result.success).toBe(false);
    });

    it('should require title', () => {
      const result = createMovieSchema.safeParse({
        tmdb_id: 12345,
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const result = createMovieSchema.safeParse({
        tmdb_id: 12345,
        title: '',
      });

      expect(result.success).toBe(false);
    });

    it('should validate genres array', () => {
      const result = createMovieSchema.safeParse({
        tmdb_id: 12345,
        title: 'Test Movie',
        genres: [
          { id: 1, name: 'Action' },
          { id: 2, name: 'Drama' },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('updateUserMovieSchema', () => {
    it('should validate user movie update', () => {
      const result = updateUserMovieSchema.safeParse({
        personal_rating: 8.5,
        is_favorite: true,
        tags: ['favorites', 'oscar-winners'],
      });

      expect(result.success).toBe(true);
    });

    it('should reject rating above 10', () => {
      const result = updateUserMovieSchema.safeParse({
        personal_rating: 15,
      });

      expect(result.success).toBe(false);
    });

    it('should reject rating below 0', () => {
      const result = updateUserMovieSchema.safeParse({
        personal_rating: -1,
      });

      expect(result.success).toBe(false);
    });

    it('should allow null rating', () => {
      const result = updateUserMovieSchema.safeParse({
        personal_rating: null,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('createVaultSchema', () => {
    it('should validate vault creation', () => {
      const result = createVaultSchema.safeParse({
        name: 'Best Action Movies',
        description: 'A collection of my favorite action movies',
      });

      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const result = createVaultSchema.safeParse({
        description: 'A collection',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = createVaultSchema.safeParse({
        name: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createTagSchema', () => {
    it('should validate tag creation', () => {
      const result = createTagSchema.safeParse({
        name: 'favorites',
        color: '#FFD700',
        icon: 'star',
      });

      expect(result.success).toBe(true);
    });

    it('should validate hex color format', () => {
      const validColors = ['#000000', '#FFFFFF', '#ff0000', '#123ABC'];

      validColors.forEach((color) => {
        const result = createTagSchema.safeParse({
          name: 'test',
          color,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid color format', () => {
      const invalidColors = ['red', '#FFF', '#GGGGGG', '000000'];

      invalidColors.forEach((color) => {
        const result = createTagSchema.safeParse({
          name: 'test',
          color,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('tmdbSearchSchema', () => {
    it('should validate search query', () => {
      const result = tmdbSearchSchema.safeParse({
        query: 'Oppenheimer',
        year: 2023,
        enhanced: true,
      });

      expect(result.success).toBe(true);
    });

    it('should require query', () => {
      const result = tmdbSearchSchema.safeParse({
        year: 2023,
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty query', () => {
      const result = tmdbSearchSchema.safeParse({
        query: '',
      });

      expect(result.success).toBe(false);
    });

    it('should default enhanced to true', () => {
      const result = tmdbSearchSchema.safeParse({
        query: 'Test',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enhanced).toBe(true);
      }
    });
  });

  describe('formatZodErrors', () => {
    it('should format validation errors', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      const result = schema.safeParse({
        name: '',
        email: 'invalid',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatZodErrors(result.error);

        expect(formatted.length).toBeGreaterThanOrEqual(2);
        expect(formatted.some((e) => e.field === 'name')).toBe(true);
        expect(formatted.some((e) => e.field === 'email')).toBe(true);
      }
    });

    it('should handle nested fields', () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(1),
        }),
      });

      const result = schema.safeParse({
        user: { name: '' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatZodErrors(result.error);
        expect(formatted[0].field).toBe('user.name');
      }
    });
  });
});
