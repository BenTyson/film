/**
 * Movie Database Query Helpers
 * Provides reusable query patterns for movie-related database operations
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { APPROVAL_STATUS } from '../constants';

/**
 * Standard include pattern for movies with all relations
 */
export const movieInclude = {
  user_movies: true,
  oscar_data: true,
  movie_tags: {
    include: {
      tags: true,
    },
  },
} as const satisfies Prisma.moviesInclude;

/**
 * Lightweight include pattern for list views
 */
export const movieListInclude = {
  user_movies: true,
  oscar_data: {
    select: {
      id: true,
      category: true,
      is_winner: true,
    },
  },
  movie_tags: {
    include: {
      tags: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
        },
      },
    },
  },
} as const satisfies Prisma.moviesInclude;

/**
 * Build where clause for user's movies
 */
export function userMoviesWhere(userId: number) {
  return {
    approval_status: APPROVAL_STATUS.APPROVED,
    user_movies: {
      some: {
        user_id: userId,
      },
    },
  } satisfies Prisma.moviesWhereInput;
}

/**
 * Build where clause with search, year, and tag filters
 */
export interface MovieFilterParams {
  userId: number;
  search?: string;
  year?: number;
  tags?: string[];
  favorites?: boolean;
  oscarStatus?: 'nominated' | 'won' | 'any';
}

export function buildMovieFilters(params: MovieFilterParams): Prisma.moviesWhereInput {
  const { userId, search, year, tags, favorites, oscarStatus } = params;

  const where: Prisma.moviesWhereInput = {
    approval_status: APPROVAL_STATUS.APPROVED,
    user_movies: {
      some: {
        user_id: userId,
        ...(favorites ? { is_favorite: true } : {}),
      },
    },
  };

  // Search filter
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { director: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Year filter
  if (year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    where.release_date = {
      gte: startDate,
      lt: endDate,
    };
  }

  // Tags filter
  if (tags && tags.length > 0) {
    where.movie_tags = {
      some: {
        tags: {
          name: { in: tags },
        },
      },
    };
  }

  // Oscar status filter
  if (oscarStatus) {
    if (oscarStatus === 'won') {
      where.oscar_data = {
        some: {
          is_winner: true,
        },
      };
    } else if (oscarStatus === 'nominated' || oscarStatus === 'any') {
      where.oscar_data = {
        some: {},
      };
    }
  }

  return where;
}

/**
 * Sort options mapping
 */
export type SortField = 'date_watched' | 'title' | 'release_date' | 'personal_rating' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export function buildMovieOrderBy(
  sortBy: SortField = 'date_watched',
  sortOrder: SortOrder = 'desc'
): Prisma.moviesOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'title':
      return [{ title: sortOrder }];
    case 'release_date':
      return [{ release_date: sortOrder }];
    case 'created_at':
      return [{ created_at: sortOrder }];
    case 'date_watched':
    default:
      // For date_watched, we need to sort by the user_movies relation
      return [
        {
          user_movies: {
            _count: sortOrder, // Fallback - ideally sort by actual date
          },
        },
      ];
  }
}

/**
 * Movie grid item type for API responses
 */
export interface MovieGridItem {
  id: number;
  tmdb_id: number;
  title: string;
  release_date: Date | null;
  director: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  personal_rating: number | null;
  date_watched: Date | null;
  is_favorite: boolean;
  oscar_badges: {
    nominations: number;
    wins: number;
    categories: string[];
  };
  tags: Array<{
    name: string;
    color: string | null;
    icon: string | null;
  }>;
}

/**
 * Transform database movie to grid item format
 */
export function transformToGridItem(
  movie: Prisma.moviesGetPayload<{ include: typeof movieListInclude }>,
  userId: number
): MovieGridItem {
  // Find user's movie data
  const userMovie = movie.user_movies.find((um) => um.user_id === userId);

  // Calculate oscar badges
  const oscarBadges = {
    nominations: movie.oscar_data?.length || 0,
    wins: movie.oscar_data?.filter((o) => o.is_winner).length || 0,
    categories: [...new Set(movie.oscar_data?.map((o) => o.category) || [])],
  };

  // Extract tags
  const tags = movie.movie_tags.map((mt) => ({
    name: mt.tags.name,
    color: mt.tags.color,
    icon: mt.tags.icon,
  }));

  return {
    id: movie.id,
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    release_date: movie.release_date,
    director: movie.director,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    personal_rating: userMovie?.personal_rating ?? null,
    date_watched: userMovie?.date_watched ?? null,
    is_favorite: userMovie?.is_favorite ?? false,
    oscar_badges: oscarBadges,
    tags,
  };
}

/**
 * Get user's movies with pagination
 */
export async function getUserMovies(
  userId: number,
  options: {
    page?: number;
    limit?: number;
    search?: string;
    year?: number;
    tags?: string[];
    favorites?: boolean;
    sortBy?: SortField;
    sortOrder?: SortOrder;
  } = {}
) {
  const {
    page = 1,
    limit = 20,
    search,
    year,
    tags,
    favorites,
    sortBy = 'date_watched',
    sortOrder = 'desc',
  } = options;

  const where = buildMovieFilters({
    userId,
    search,
    year,
    tags,
    favorites,
  });

  const skip = (page - 1) * limit;

  const [movies, total] = await Promise.all([
    prisma.movies.findMany({
      where,
      include: movieListInclude,
      skip,
      take: limit,
      orderBy: buildMovieOrderBy(sortBy, sortOrder),
    }),
    prisma.movies.count({ where }),
  ]);

  return {
    movies: movies.map((m) => transformToGridItem(m, userId)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get single movie with full details
 */
export async function getMovieById(movieId: number, userId: number) {
  const movie = await prisma.movies.findUnique({
    where: { id: movieId },
    include: movieInclude,
  });

  if (!movie) {
    return null;
  }

  return {
    ...movie,
    userMovie: movie.user_movies.find((um) => um.user_id === userId) || null,
  };
}

/**
 * Get available years for user's movies
 */
export async function getAvailableYears(userId: number): Promise<number[]> {
  const movies = await prisma.movies.findMany({
    where: userMoviesWhere(userId),
    select: {
      release_date: true,
    },
    distinct: ['release_date'],
  });

  const years = movies
    .map((m) => m.release_date?.getFullYear())
    .filter((year): year is number => year !== undefined && year !== null);

  return [...new Set(years)].sort((a, b) => b - a);
}

/**
 * Get movie count statistics
 */
export async function getMovieStats(userId: number) {
  const [total, favorites, withOscars, thisYear] = await Promise.all([
    prisma.movies.count({
      where: userMoviesWhere(userId),
    }),
    prisma.movies.count({
      where: {
        ...userMoviesWhere(userId),
        user_movies: {
          some: {
            user_id: userId,
            is_favorite: true,
          },
        },
      },
    }),
    prisma.movies.count({
      where: {
        ...userMoviesWhere(userId),
        oscar_data: {
          some: {},
        },
      },
    }),
    prisma.movies.count({
      where: {
        ...userMoviesWhere(userId),
        release_date: {
          gte: new Date(new Date().getFullYear(), 0, 1),
        },
      },
    }),
  ]);

  return {
    total,
    favorites,
    withOscars,
    thisYear,
  };
}
