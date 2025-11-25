import { describe, it, expect, vi } from 'vitest';
import { buildMovieFilters, transformToGridItem, movieListInclude } from './movie-queries';
import { APPROVAL_STATUS } from '../constants';

// Mock prisma
vi.mock('../prisma', () => ({
  prisma: {},
}));

describe('Movie Query Helpers', () => {
  describe('buildMovieFilters', () => {
    it('should build basic user filter', () => {
      const filters = buildMovieFilters({ userId: 1 });

      expect(filters.approval_status).toBe(APPROVAL_STATUS.APPROVED);
      expect(filters.user_movies).toEqual({
        some: { user_id: 1 },
      });
    });

    it('should include search filter', () => {
      const filters = buildMovieFilters({
        userId: 1,
        search: 'Test Movie',
      });

      expect(filters.OR).toEqual([
        { title: { contains: 'Test Movie', mode: 'insensitive' } },
        { director: { contains: 'Test Movie', mode: 'insensitive' } },
      ]);
    });

    it('should include year filter', () => {
      const filters = buildMovieFilters({
        userId: 1,
        year: 2024,
      });

      expect(filters.release_date).toEqual({
        gte: new Date(2024, 0, 1),
        lt: new Date(2025, 0, 1),
      });
    });

    it('should include tags filter', () => {
      const filters = buildMovieFilters({
        userId: 1,
        tags: ['favorites', 'oscar-winners'],
      });

      expect(filters.movie_tags).toEqual({
        some: {
          tags: {
            name: { in: ['favorites', 'oscar-winners'] },
          },
        },
      });
    });

    it('should include favorites filter', () => {
      const filters = buildMovieFilters({
        userId: 1,
        favorites: true,
      });

      expect(filters.user_movies).toEqual({
        some: {
          user_id: 1,
          is_favorite: true,
        },
      });
    });

    it('should include oscar won filter', () => {
      const filters = buildMovieFilters({
        userId: 1,
        oscarStatus: 'won',
      });

      expect(filters.oscar_data).toEqual({
        some: { is_winner: true },
      });
    });

    it('should include oscar nominated filter', () => {
      const filters = buildMovieFilters({
        userId: 1,
        oscarStatus: 'nominated',
      });

      expect(filters.oscar_data).toEqual({
        some: {},
      });
    });

    it('should combine multiple filters', () => {
      const filters = buildMovieFilters({
        userId: 1,
        search: 'Action',
        year: 2023,
        favorites: true,
      });

      expect(filters.approval_status).toBe(APPROVAL_STATUS.APPROVED);
      expect(filters.OR).toBeDefined();
      expect(filters.release_date).toBeDefined();
      expect(filters.user_movies).toEqual({
        some: {
          user_id: 1,
          is_favorite: true,
        },
      });
    });
  });

  describe('transformToGridItem', () => {
    const mockMovie = {
      id: 1,
      tmdb_id: 12345,
      title: 'Test Movie',
      release_date: new Date('2024-01-15'),
      director: 'Test Director',
      poster_path: '/test-poster.jpg',
      backdrop_path: '/test-backdrop.jpg',
      overview: 'Test overview',
      runtime: 120,
      genres: [{ id: 1, name: 'Action' }],
      imdb_id: 'tt1234567',
      imdb_rating: 7.5,
      csv_row_number: null,
      csv_title: null,
      csv_director: null,
      csv_year: null,
      csv_notes: null,
      approval_status: 'approved',
      created_at: new Date(),
      updated_at: new Date(),
      user_movies: [
        {
          id: 1,
          movie_id: 1,
          user_id: 1,
          date_watched: new Date('2024-01-20'),
          personal_rating: 8,
          notes: null,
          is_favorite: true,
          watch_location: null,
          buddy_watched_with: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      oscar_data: [
        { id: 1, category: 'Best Picture', is_winner: true },
        { id: 2, category: 'Best Director', is_winner: false },
      ],
      movie_tags: [
        {
          id: 1,
          tags: { id: 1, name: 'favorites', color: '#FFD700', icon: 'star' },
        },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    it('should transform movie to grid item', () => {
      const gridItem = transformToGridItem(mockMovie, 1);

      expect(gridItem.id).toBe(1);
      expect(gridItem.tmdb_id).toBe(12345);
      expect(gridItem.title).toBe('Test Movie');
      expect(gridItem.director).toBe('Test Director');
      expect(gridItem.poster_path).toBe('/test-poster.jpg');
    });

    it('should include user movie data', () => {
      const gridItem = transformToGridItem(mockMovie, 1);

      expect(gridItem.personal_rating).toBe(8);
      expect(gridItem.date_watched).toEqual(new Date('2024-01-20'));
      expect(gridItem.is_favorite).toBe(true);
    });

    it('should calculate oscar badges', () => {
      const gridItem = transformToGridItem(mockMovie, 1);

      expect(gridItem.oscar_badges.nominations).toBe(2);
      expect(gridItem.oscar_badges.wins).toBe(1);
      expect(gridItem.oscar_badges.categories).toContain('Best Picture');
      expect(gridItem.oscar_badges.categories).toContain('Best Director');
    });

    it('should extract tags', () => {
      const gridItem = transformToGridItem(mockMovie, 1);

      expect(gridItem.tags).toHaveLength(1);
      expect(gridItem.tags[0].name).toBe('favorites');
      expect(gridItem.tags[0].color).toBe('#FFD700');
    });

    it('should handle missing user movie data', () => {
      const movieWithoutUserData = {
        ...mockMovie,
        user_movies: [],
      };

      const gridItem = transformToGridItem(movieWithoutUserData, 1);

      expect(gridItem.personal_rating).toBeNull();
      expect(gridItem.date_watched).toBeNull();
      expect(gridItem.is_favorite).toBe(false);
    });

    it('should handle different user ID', () => {
      const gridItem = transformToGridItem(mockMovie, 999);

      // User 999 has no data in user_movies
      expect(gridItem.personal_rating).toBeNull();
      expect(gridItem.is_favorite).toBe(false);
    });
  });

  describe('movieListInclude', () => {
    it('should have correct structure', () => {
      expect(movieListInclude.user_movies).toBe(true);
      expect(movieListInclude.oscar_data).toBeDefined();
      expect(movieListInclude.movie_tags).toBeDefined();
    });
  });
});
