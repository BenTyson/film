/**
 * API Response Utilities
 * Provides standardized response formats for all API routes
 */

import { NextResponse } from 'next/server';
import { HTTP_STATUS, ERROR_MESSAGE } from './constants';

/**
 * Standard API response types
 */
export interface APISuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface APIErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  timestamp?: string;
}

export type APIResponse<T = unknown> = APISuccessResponse<T> | APIErrorResponse;

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * API Response Builder
 * Provides consistent methods for creating standardized API responses
 */
export class APIResponseBuilder {
  /**
   * Success response with data
   */
  static success<T>(data: T, status: number = HTTP_STATUS.OK): NextResponse<APISuccessResponse<T>> {
    return NextResponse.json(
      {
        success: true as const,
        data,
      },
      { status }
    );
  }

  /**
   * Error response with message
   */
  static error(
    message: string,
    status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details?: unknown
  ): NextResponse<APIErrorResponse> {
    return NextResponse.json(
      {
        success: false as const,
        error: message,
        ...(details !== undefined ? { details } : {}),
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  }

  /**
   * Bad request (400) response
   */
  static badRequest(
    message: string = ERROR_MESSAGE.INVALID_INPUT,
    validation?: ValidationError[]
  ): NextResponse<APIErrorResponse> {
    return this.error(message, HTTP_STATUS.BAD_REQUEST, validation);
  }

  /**
   * Unauthorized (401) response
   */
  static unauthorized(
    message: string = ERROR_MESSAGE.UNAUTHORIZED
  ): NextResponse<APIErrorResponse> {
    return this.error(message, HTTP_STATUS.UNAUTHORIZED);
  }

  /**
   * Forbidden (403) response
   */
  static forbidden(
    message: string = ERROR_MESSAGE.FORBIDDEN
  ): NextResponse<APIErrorResponse> {
    return this.error(message, HTTP_STATUS.FORBIDDEN);
  }

  /**
   * Not found (404) response
   */
  static notFound(
    message: string = ERROR_MESSAGE.NOT_FOUND
  ): NextResponse<APIErrorResponse> {
    return this.error(message, HTTP_STATUS.NOT_FOUND);
  }

  /**
   * Conflict (409) response
   */
  static conflict(
    message: string = ERROR_MESSAGE.ALREADY_EXISTS
  ): NextResponse<APIErrorResponse> {
    return this.error(message, HTTP_STATUS.CONFLICT);
  }

  /**
   * Created (201) response with data
   */
  static created<T>(data: T): NextResponse<APISuccessResponse<T>> {
    return this.success(data, HTTP_STATUS.CREATED);
  }

  /**
   * No content (204) response
   */
  static noContent(): NextResponse {
    return new NextResponse(null, { status: HTTP_STATUS.NO_CONTENT });
  }

  /**
   * Database error response
   */
  static databaseError(error?: unknown): NextResponse<APIErrorResponse> {
    console.error('Database error:', error);
    return this.error(
      ERROR_MESSAGE.DATABASE_ERROR,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      process.env.NODE_ENV === 'development' ? error : undefined
    );
  }

  /**
   * TMDB API error response
   */
  static tmdbError(error?: unknown): NextResponse<APIErrorResponse> {
    console.error('TMDB API error:', error);
    return this.error(
      ERROR_MESSAGE.TMDB_ERROR,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      process.env.NODE_ENV === 'development' ? error : undefined
    );
  }
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
  response: APIResponse<T>
): response is APISuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(
  response: APIResponse
): response is APIErrorResponse {
  return response.success === false;
}

/**
 * Extract data from success response or throw error
 */
export function unwrapResponse<T>(response: APIResponse<T>): T {
  if (isSuccessResponse(response)) {
    return response.data;
  }
  throw new Error(response.error);
}

/**
 * Backwards compatibility: Legacy response format support
 * @deprecated Use APIResponseBuilder instead
 */
export function legacySuccessResponse<T>(data: T, status: number = 200): NextResponse {
  console.warn(
    'DEPRECATED: legacySuccessResponse is deprecated. Use APIResponseBuilder.success() instead.'
  );
  return APIResponseBuilder.success(data, status);
}

/**
 * Backwards compatibility: Legacy error format support
 * @deprecated Use APIResponseBuilder instead
 */
export function legacyErrorResponse(message: string, status: number = 500): NextResponse {
  console.warn(
    'DEPRECATED: legacyErrorResponse is deprecated. Use APIResponseBuilder.error() instead.'
  );
  return APIResponseBuilder.error(message, status);
}
