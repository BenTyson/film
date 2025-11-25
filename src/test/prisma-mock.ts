import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';

/**
 * Mock Prisma Client for testing
 * Use this instead of the real Prisma client in tests
 */
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

/**
 * Reset the mock between tests
 */
export function resetPrismaMock() {
  mockReset(prismaMock);
}

/**
 * Mock Prisma module
 * Add this to your test file: vi.mock('@/lib/prisma')
 */
export function mockPrisma() {
  return {
    prisma: prismaMock,
  };
}

// Example mock data factories
export const mockMovie = {
  id: 1,
  tmdb_id: 12345,
  title: 'Test Movie',
  director: 'Test Director',
  release_date: new Date('2024-01-01'),
  overview: 'Test overview',
  poster_path: '/test-poster.jpg',
  backdrop_path: '/test-backdrop.jpg',
  approval_status: 'approved' as const,
  created_at: new Date(),
  updated_at: new Date(),
};

export const mockUserMovie = {
  id: 1,
  user_id: 1,
  movie_id: 1,
  date_watched: new Date('2024-01-15'),
  personal_rating: 8,
  notes: 'Great movie!',
  is_favorite: false,
  buddy_watched_with: ['Calen'],
  created_at: new Date(),
  updated_at: new Date(),
};

export const mockTag = {
  id: 1,
  name: 'favorites',
  color: '#FFD700',
  icon: 'star',
  user_id: null,
  created_at: new Date(),
  updated_at: new Date(),
};
