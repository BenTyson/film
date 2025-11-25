/**
 * API Middleware System
 * Provides reusable middleware wrappers for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAdmin } from './auth';
import { APIResponseBuilder } from './api-response';
import { prisma } from './prisma';

/**
 * User type from database
 */
export interface User {
  id: number;
  clerk_id: string;
  email: string;
  name: string | null;
  role: string;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Context passed to route handlers with user info
 */
export interface AuthContext {
  user: User;
  request: NextRequest;
  params?: Record<string, string>;
}

/**
 * Context for unauthenticated routes
 */
export interface RequestContext {
  request: NextRequest;
  params?: Record<string, string>;
}

/**
 * Route handler function types
 */
export type AuthenticatedHandler = (
  context: AuthContext
) => Promise<NextResponse>;

export type AdminHandler = (
  context: AuthContext
) => Promise<NextResponse>;

export type PublicHandler = (
  context: RequestContext
) => Promise<NextResponse>;

/**
 * Middleware that requires authentication
 * Automatically handles unauthorized responses
 *
 * @example
 * export const GET = withAuth(async ({ user, request }) => {
 *   const movies = await prisma.movies.findMany({
 *     where: { user_movies: { some: { user_id: user.id } } }
 *   });
 *   return APIResponseBuilder.success({ movies });
 * });
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (
    request: NextRequest,
    { params }: { params?: Promise<Record<string, string>> } = {}
  ): Promise<NextResponse> => {
    try {
      const user = await getCurrentUser();
      const resolvedParams = params ? await params : undefined;

      return await handler({
        user,
        request,
        params: resolvedParams,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          return APIResponseBuilder.unauthorized();
        }
      }

      console.error('Auth middleware error:', error);
      return APIResponseBuilder.error('Authentication error');
    }
  };
}

/**
 * Middleware that requires admin privileges
 * Automatically handles unauthorized and forbidden responses
 *
 * @example
 * export const GET = withAdmin(async ({ user, request }) => {
 *   // Only admin users can access this
 *   const allUsers = await prisma.users.findMany();
 *   return APIResponseBuilder.success({ users: allUsers });
 * });
 */
export function withAdmin(handler: AdminHandler) {
  return async (
    request: NextRequest,
    { params }: { params?: Promise<Record<string, string>> } = {}
  ): Promise<NextResponse> => {
    try {
      const user = await requireAdmin();
      const resolvedParams = params ? await params : undefined;

      return await handler({
        user,
        request,
        params: resolvedParams,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          return APIResponseBuilder.unauthorized();
        }
        if (error.message.includes('Forbidden')) {
          return APIResponseBuilder.forbidden(error.message);
        }
      }

      console.error('Admin middleware error:', error);
      return APIResponseBuilder.error('Authorization error');
    }
  };
}

/**
 * Middleware that logs errors to the database
 * Should be used with withAuth or withAdmin
 *
 * @example
 * export const GET = withAuth(withErrorLogging(async ({ user, request }) => {
 *   // Errors will be logged to the database
 *   const movies = await prisma.movies.findMany();
 *   return APIResponseBuilder.success({ movies });
 * }));
 */
export function withErrorLogging(handler: AuthenticatedHandler): AuthenticatedHandler {
  return async (context: AuthContext): Promise<NextResponse> => {
    const { request, user } = context;
    const startTime = Date.now();

    try {
      const response = await handler(context);

      // Log slow requests (over 5 seconds)
      const duration = Date.now() - startTime;
      if (duration > 5000) {
        console.warn(`Slow request: ${request.method} ${request.url} took ${duration}ms`);
      }

      return response;
    } catch (error) {
      // Log error to database
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : undefined;

      try {
        await prisma.error_logs.create({
          data: {
            user_id: user.id,
            endpoint: new URL(request.url).pathname,
            method: request.method,
            status_code: 500,
            error_message: errorMessage,
            stack_trace: stackTrace,
            request_params: Object.fromEntries(new URL(request.url).searchParams),
          },
        });
      } catch (logError) {
        console.error('Failed to log error to database:', logError);
      }

      console.error(`API Error [${request.method} ${request.url}]:`, error);

      // Re-throw to let parent middleware handle
      throw error;
    }
  };
}

/**
 * Middleware for public routes (no authentication required)
 * Useful for TMDB proxy endpoints or public data
 *
 * @example
 * export const GET = withPublic(async ({ request }) => {
 *   // No authentication needed
 *   const data = await fetchPublicData();
 *   return APIResponseBuilder.success(data);
 * });
 */
export function withPublic(handler: PublicHandler) {
  return async (
    request: NextRequest,
    { params }: { params?: Promise<Record<string, string>> } = {}
  ): Promise<NextResponse> => {
    try {
      const resolvedParams = params ? await params : undefined;

      return await handler({
        request,
        params: resolvedParams,
      });
    } catch (error) {
      console.error('Public route error:', error);
      return APIResponseBuilder.error(
        error instanceof Error ? error.message : 'An error occurred'
      );
    }
  };
}

/**
 * Compose multiple middlewares together
 * Middlewares are applied right-to-left (innermost to outermost)
 *
 * @example
 * export const GET = compose(
 *   withAuth,
 *   withErrorLogging
 * )(async ({ user, request }) => {
 *   const movies = await prisma.movies.findMany();
 *   return APIResponseBuilder.success({ movies });
 * });
 */
export function compose<T extends (...args: unknown[]) => unknown>(
  ...middlewares: Array<(handler: T) => T>
): (handler: T) => T {
  return (handler: T) =>
    middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
}

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

/**
 * Simple in-memory rate limiter
 * Note: For production, use Redis-based rate limiting
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Middleware that adds rate limiting
 *
 * @example
 * export const POST = withAuth(withRateLimit({ windowMs: 60000, maxRequests: 10 })(
 *   async ({ user, request }) => {
 *     // Limited to 10 requests per minute
 *     return APIResponseBuilder.success({});
 *   }
 * ));
 */
export function withRateLimit(config: RateLimitConfig) {
  return function (handler: AuthenticatedHandler): AuthenticatedHandler {
    return async (context: AuthContext): Promise<NextResponse> => {
      const { user } = context;
      const key = `${user.id}:${new URL(context.request.url).pathname}`;
      const now = Date.now();

      const entry = rateLimitStore.get(key);

      if (entry && entry.resetAt > now) {
        if (entry.count >= config.maxRequests) {
          return APIResponseBuilder.error(
            'Too many requests. Please try again later.',
            429
          );
        }
        entry.count++;
      } else {
        rateLimitStore.set(key, {
          count: 1,
          resetAt: now + config.windowMs,
        });
      }

      return handler(context);
    };
  };
}

/**
 * Activity logging middleware
 * Logs user actions to the activity_logs table
 *
 * @example
 * export const POST = withAuth(withActivityLog('movie_added', 'movie')(
 *   async ({ user, request }) => {
 *     const movie = await createMovie(...);
 *     return APIResponseBuilder.success(movie);
 *   }
 * ));
 */
export function withActivityLog(
  actionType: string,
  targetType: string
) {
  return function (handler: AuthenticatedHandler): AuthenticatedHandler {
    return async (context: AuthContext): Promise<NextResponse> => {
      const response = await handler(context);
      const { user, request } = context;

      // Only log successful operations
      if (response.status >= 200 && response.status < 300) {
        try {
          // Get target ID from response if available
          const responseClone = response.clone();
          const data = await responseClone.json().catch(() => null);
          const targetId = data?.data?.id || null;

          await prisma.activity_logs.create({
            data: {
              user_id: user.id,
              action_type: actionType,
              target_type: targetType,
              target_id: targetId,
              metadata: {
                method: request.method,
                path: new URL(request.url).pathname,
              },
              ip_address: request.headers.get('x-forwarded-for') || 'unknown',
              user_agent: request.headers.get('user-agent') || 'unknown',
            },
          });
        } catch (logError) {
          console.error('Failed to log activity:', logError);
        }
      }

      return response;
    };
  };
}
