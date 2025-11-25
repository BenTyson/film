/**
 * API Input Validation Schemas
 * Uses Zod for runtime type validation
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { APIResponseBuilder } from '../api-response';

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Sort schema
 */
export const sortSchema = z.object({
  sortBy: z.enum(['date_watched', 'title', 'release_date', 'personal_rating', 'created_at']).default('date_watched'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * ID parameter schema
 */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ============================================================================
// Movie Schemas
// ============================================================================

/**
 * Movie filter query schema
 */
export const movieFilterSchema = z.object({
  search: z.string().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  tag: z.string().optional(),
  favorites: z.coerce.boolean().optional(),
  oscarStatus: z.enum(['nominated', 'won', 'any']).optional(),
  ...paginationSchema.shape,
  ...sortSchema.shape,
});

/**
 * Create movie schema
 */
export const createMovieSchema = z.object({
  tmdb_id: z.number().int().positive(),
  title: z.string().min(1).max(500),
  director: z.string().max(500).nullable().optional(),
  release_date: z.string().datetime().nullable().optional(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().max(255).nullable().optional(),
  backdrop_path: z.string().max(255).nullable().optional(),
  runtime: z.number().int().positive().nullable().optional(),
  genres: z.array(z.object({
    id: z.number(),
    name: z.string(),
  })).nullable().optional(),
  imdb_id: z.string().max(20).nullable().optional(),
});

/**
 * Update user movie schema
 */
export const updateUserMovieSchema = z.object({
  personal_rating: z.number().min(0).max(10).nullable().optional(),
  date_watched: z.string().datetime().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  is_favorite: z.boolean().optional(),
  watch_location: z.string().max(255).nullable().optional(),
  buddy_watched_with: z.array(z.string()).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// Watchlist Schemas
// ============================================================================

/**
 * Add to watchlist schema
 */
export const addToWatchlistSchema = z.object({
  tmdb_id: z.number().int().positive(),
  title: z.string().min(1).max(500),
  director: z.string().max(500).nullable().optional(),
  release_date: z.string().nullable().optional(),
  poster_path: z.string().max(255).nullable().optional(),
  backdrop_path: z.string().max(255).nullable().optional(),
  overview: z.string().nullable().optional(),
  runtime: z.number().int().positive().nullable().optional(),
  genres: z.array(z.object({
    id: z.number(),
    name: z.string(),
  })).nullable().optional(),
  vote_average: z.number().nullable().optional(),
  imdb_id: z.string().max(20).nullable().optional(),
  tagIds: z.array(z.number()).optional(),
});

// ============================================================================
// Vault Schemas
// ============================================================================

/**
 * Create vault schema
 */
export const createVaultSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
});

/**
 * Update vault schema
 */
export const updateVaultSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
});

/**
 * Add movie to vault schema
 */
export const addVaultMovieSchema = z.object({
  tmdb_id: z.number().int().positive(),
  title: z.string().min(1).max(500),
  director: z.string().max(500).nullable().optional(),
  release_date: z.string().nullable().optional(),
  poster_path: z.string().max(255).nullable().optional(),
  backdrop_path: z.string().max(255).nullable().optional(),
  overview: z.string().nullable().optional(),
  runtime: z.number().int().positive().nullable().optional(),
  genres: z.array(z.object({
    id: z.number(),
    name: z.string(),
  })).nullable().optional(),
  vote_average: z.number().nullable().optional(),
  imdb_id: z.string().max(20).nullable().optional(),
});

// ============================================================================
// Tag Schemas
// ============================================================================

/**
 * Create tag schema
 */
export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
});

// ============================================================================
// TMDB Schemas
// ============================================================================

/**
 * TMDB search schema
 */
export const tmdbSearchSchema = z.object({
  query: z.string().min(1).max(500),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  enhanced: z.boolean().default(true),
});

// ============================================================================
// Admin Schemas
// ============================================================================

/**
 * Update user role schema
 */
export const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

// ============================================================================
// Oscar Schemas
// ============================================================================

/**
 * Oscar filter schema
 */
export const oscarFilterSchema = z.object({
  year: z.coerce.number().int().min(1928).max(2100).optional(),
  category: z.string().optional(),
  winnersOnly: z.coerce.boolean().optional(),
  ...paginationSchema.shape,
});

/**
 * Update oscar movie schema
 */
export const updateOscarMovieSchema = z.object({
  tmdb_id: z.number().int().positive(),
  title: z.string().min(1).max(500).optional(),
});

// ============================================================================
// Validation Middleware
// ============================================================================

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: z.ZodError };

/**
 * Validate request body against a schema
 */
export async function validateBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<ValidationResult<z.infer<T>>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return { success: false, errors: result.error };
    }

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      errors: new z.ZodError([
        {
          code: 'custom',
          path: [],
          message: 'Invalid JSON body',
        },
      ]),
    };
  }
}

/**
 * Validate query parameters against a schema
 */
export function validateQuery<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): ValidationResult<z.infer<T>> {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const result = schema.safeParse(searchParams);

  if (!result.success) {
    return { success: false, errors: result.error };
  }

  return { success: true, data: result.data };
}

/**
 * Format Zod errors for API response
 */
export function formatZodErrors(error: z.ZodError): Array<{
  field: string;
  message: string;
}> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Higher-order function for validated routes
 *
 * @example
 * export const POST = withValidation(createMovieSchema)(async (data, context) => {
 *   // data is typed as z.infer<typeof createMovieSchema>
 *   const movie = await prisma.movies.create({ data });
 *   return APIResponseBuilder.success(movie);
 * });
 */
export function withBodyValidation<T extends z.ZodTypeAny>(schema: T) {
  return function (
    handler: (
      data: z.infer<T>,
      context: { request: NextRequest; params?: Record<string, string> }
    ) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      { params }: { params?: Promise<Record<string, string>> } = {}
    ): Promise<NextResponse> => {
      const result = await validateBody(request, schema);

      if (!result.success) {
        return APIResponseBuilder.badRequest(
          'Validation failed',
          formatZodErrors(result.errors)
        );
      }

      const resolvedParams = params ? await params : undefined;
      return handler(result.data, { request, params: resolvedParams });
    };
  };
}

/**
 * Higher-order function for query validation
 */
export function withQueryValidation<T extends z.ZodTypeAny>(schema: T) {
  return function (
    handler: (
      query: z.infer<T>,
      context: { request: NextRequest; params?: Record<string, string> }
    ) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      { params }: { params?: Promise<Record<string, string>> } = {}
    ): Promise<NextResponse> => {
      const result = validateQuery(request, schema);

      if (!result.success) {
        return APIResponseBuilder.badRequest(
          'Invalid query parameters',
          formatZodErrors(result.errors)
        );
      }

      const resolvedParams = params ? await params : undefined;
      return handler(result.data, { request, params: resolvedParams });
    };
  };
}

// ============================================================================
// Type Exports
// ============================================================================

export type MovieFilter = z.infer<typeof movieFilterSchema>;
export type CreateMovie = z.infer<typeof createMovieSchema>;
export type UpdateUserMovie = z.infer<typeof updateUserMovieSchema>;
export type AddToWatchlist = z.infer<typeof addToWatchlistSchema>;
export type CreateVault = z.infer<typeof createVaultSchema>;
export type UpdateVault = z.infer<typeof updateVaultSchema>;
export type AddVaultMovie = z.infer<typeof addVaultMovieSchema>;
export type CreateTag = z.infer<typeof createTagSchema>;
export type TMDBSearch = z.infer<typeof tmdbSearchSchema>;
export type OscarFilter = z.infer<typeof oscarFilterSchema>;
