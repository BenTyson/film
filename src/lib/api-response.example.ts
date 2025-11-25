/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Example API Route using APIResponseBuilder
 * This file demonstrates how to use the standardized response utilities
 */

import { NextRequest } from 'next/server';
import { APIResponseBuilder } from './api-response';
// HTTP_STATUS is available for custom status codes - see constants/index.ts

/**
 * Example GET endpoint
 */
export async function exampleGET(_request: NextRequest) {
  try {
    // Simulate fetching data
    const movies = [
      { id: 1, title: 'Movie 1' },
      { id: 2, title: 'Movie 2' },
    ];

    // Success response
    return APIResponseBuilder.success({
      movies,
      total: movies.length,
    });
  } catch (err) {
    // Error response
    return APIResponseBuilder.databaseError(err);
  }
}

/**
 * Example POST endpoint with validation
 */
export async function examplePOST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.title) {
      return APIResponseBuilder.badRequest('Title is required', [
        { field: 'title', message: 'Title cannot be empty' },
      ]);
    }

    // Simulate creating a resource
    const newMovie = {
      id: 123,
      title: body.title,
      created_at: new Date(),
    };

    // Created response (201)
    return APIResponseBuilder.created(newMovie);
  } catch (_err) {
    return APIResponseBuilder.error('Failed to create movie');
  }
}

/**
 * Example endpoint with authentication check
 */
export async function exampleAuthRequired(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return APIResponseBuilder.unauthorized();
  }

  // Continue with authenticated logic
  return APIResponseBuilder.success({ message: 'Authenticated!' });
}

/**
 * Example endpoint with admin check
 */
export async function exampleAdminRequired(request: NextRequest) {
  const userRole = request.headers.get('x-user-role');

  if (userRole !== 'admin') {
    return APIResponseBuilder.forbidden('Admin access required');
  }

  // Continue with admin logic
  return APIResponseBuilder.success({ message: 'Admin access granted' });
}

/**
 * Example endpoint with not found
 */
export async function exampleNotFound(request: NextRequest, id: number) {
  // Simulate database lookup
  const movie = null; // Not found

  if (!movie) {
    return APIResponseBuilder.notFound(`Movie with ID ${id} not found`);
  }

  return APIResponseBuilder.success(movie);
}

/**
 * Example endpoint with conflict
 */
export async function exampleConflict(request: NextRequest) {
  const body = await request.json();

  // Simulate checking for existing resource
  const exists = true; // Movie already exists

  if (exists) {
    return APIResponseBuilder.conflict(
      `Movie with TMDB ID ${body.tmdb_id} already exists`
    );
  }

  return APIResponseBuilder.created(body);
}

/**
 * Example DELETE endpoint
 */
export async function exampleDELETE(_request: NextRequest) {
  try {
    // Simulate deletion
    // ... delete logic

    // No content response (204)
    return APIResponseBuilder.noContent();
  } catch (_err) {
    return APIResponseBuilder.error('Failed to delete movie');
  }
}

/**
 * MIGRATION GUIDE:
 *
 * OLD PATTERN (inconsistent):
 * ```typescript
 * // Pattern 1
 * return NextResponse.json({ success: false, error: 'message' }, { status: 500 });
 *
 * // Pattern 2
 * return NextResponse.json({ error: 'message' }, { status: 500 });
 *
 * // Pattern 3
 * throw new Error('message');
 * ```
 *
 * NEW PATTERN (consistent):
 * ```typescript
 * return APIResponseBuilder.error('message', 500);
 * return APIResponseBuilder.badRequest('message');
 * return APIResponseBuilder.unauthorized();
 * return APIResponseBuilder.notFound();
 * return APIResponseBuilder.success(data);
 * return APIResponseBuilder.created(data);
 * ```
 *
 * BENEFITS:
 * 1. Consistent response structure across all endpoints
 * 2. Type-safe responses
 * 3. Built-in error logging
 * 4. Timestamp tracking
 * 5. Development-only error details
 * 6. Easier to test
 * 7. Better client-side error handling
 */
