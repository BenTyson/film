/**
 * Centralized API Client
 * Provides type-safe, consistent API calls with error handling and toast notifications
 */

import { toast } from 'sonner';
import { API_ENDPOINTS } from './constants';
import type { APIResponse, APISuccessResponse, APIErrorResponse } from './api-response';

/**
 * API Client Configuration
 */
interface APIClientConfig {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

/**
 * Request options
 */
interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * API Client Error
 */
export class APIClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: APIErrorResponse
  ) {
    super(message);
    this.name = 'APIClientError';
  }
}

/**
 * Centralized API Client
 * Handles all API communication with consistent error handling
 */
export class APIClient {
  private config: Required<APIClientConfig>;

  constructor(config: APIClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      defaultHeaders: config.defaultHeaders || {
        'Content-Type': 'application/json',
      },
      timeout: config.timeout || 30000,
      showSuccessToast: config.showSuccessToast ?? false,
      showErrorToast: config.showErrorToast ?? true,
      retryOnError: config.retryOnError ?? false,
      maxRetries: config.maxRetries || 3,
    };
  }

  /**
   * Generic request method
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;
    const headers = { ...this.config.defaultHeaders, ...options.headers };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const json: APIResponse<T> = await response.json();

      // Handle error response
      if (!json.success) {
        const errorResponse = json as APIErrorResponse;
        const errorMessage = options.errorMessage || errorResponse.error;

        // Show error toast if enabled
        if (options.showErrorToast ?? this.config.showErrorToast) {
          toast.error(errorMessage);
        }

        throw new APIClientError(errorMessage, response.status, errorResponse);
      }

      // Handle success response
      const successResponse = json as APISuccessResponse<T>;

      // Show success toast if enabled
      if (options.showSuccessToast ?? this.config.showSuccessToast) {
        toast.success(options.successMessage || 'Success!');
      }

      return successResponse.data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        const message = 'Request timeout';
        if (options.showErrorToast ?? this.config.showErrorToast) {
          toast.error(message);
        }
        throw new APIClientError(message);
      }

      // Handle network errors
      if (error instanceof TypeError) {
        const message = 'Network error - please check your connection';
        if (options.showErrorToast ?? this.config.showErrorToast) {
          toast.error(message);
        }
        throw new APIClientError(message);
      }

      // Re-throw APIClientError
      if (error instanceof APIClientError) {
        throw error;
      }

      // Handle unknown errors
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      if (options.showErrorToast ?? this.config.showErrorToast) {
        toast.error(message);
      }
      throw new APIClientError(message);
    }
  }

  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: RequestOptions
  ): Promise<T> {
    // Build query string
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url = `${endpoint}?${queryString}`;
      }
    }

    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
}

/**
 * Default API client instance
 */
export const apiClient = new APIClient();

/**
 * Typed API endpoints using constants
 * These provide autocomplete and type safety for common endpoints
 */
export const api = {
  // Movies
  movies: {
    getAll: (params?: Record<string, string | number | boolean | undefined>) =>
      apiClient.get(API_ENDPOINTS.MOVIES, params),
    getById: (id: number) =>
      apiClient.get(API_ENDPOINTS.MOVIE_BY_ID(id)),
    create: (data: unknown) =>
      apiClient.post(API_ENDPOINTS.MOVIES, data, {
        showSuccessToast: true,
        successMessage: 'Movie added successfully',
      }),
    update: (id: number, data: unknown) =>
      apiClient.patch(API_ENDPOINTS.MOVIE_BY_ID(id), data, {
        showSuccessToast: true,
        successMessage: 'Movie updated successfully',
      }),
    delete: (id: number) =>
      apiClient.delete(API_ENDPOINTS.MOVIE_BY_ID(id), {
        showSuccessToast: true,
        successMessage: 'Movie deleted successfully',
      }),
  },

  // Watchlist
  watchlist: {
    getAll: () => apiClient.get(API_ENDPOINTS.WATCHLIST),
    getById: (id: number) => apiClient.get(API_ENDPOINTS.WATCHLIST_BY_ID(id)),
    create: (data: unknown) =>
      apiClient.post(API_ENDPOINTS.WATCHLIST, data, {
        showSuccessToast: true,
        successMessage: 'Added to watchlist',
      }),
    delete: (id: number) =>
      apiClient.delete(API_ENDPOINTS.WATCHLIST_BY_ID(id), {
        showSuccessToast: true,
        successMessage: 'Removed from watchlist',
      }),
  },

  // Vaults
  vaults: {
    getAll: () => apiClient.get(API_ENDPOINTS.VAULTS),
    getById: (id: number) => apiClient.get(API_ENDPOINTS.VAULT_BY_ID(id)),
    create: (data: unknown) =>
      apiClient.post(API_ENDPOINTS.VAULTS, data, {
        showSuccessToast: true,
        successMessage: 'Vault created successfully',
      }),
    update: (id: number, data: unknown) =>
      apiClient.patch(API_ENDPOINTS.VAULT_BY_ID(id), data, {
        showSuccessToast: true,
        successMessage: 'Vault updated successfully',
      }),
    delete: (id: number) =>
      apiClient.delete(API_ENDPOINTS.VAULT_BY_ID(id), {
        showSuccessToast: true,
        successMessage: 'Vault deleted successfully',
      }),
    addMovie: (vaultId: number, data: unknown) =>
      apiClient.post(API_ENDPOINTS.VAULT_MOVIES(vaultId), data, {
        showSuccessToast: true,
        successMessage: 'Movie added to vault',
      }),
  },

  // Tags
  tags: {
    getAll: () => apiClient.get(API_ENDPOINTS.TAGS),
    create: (data: unknown) =>
      apiClient.post(API_ENDPOINTS.TAGS, data, {
        showSuccessToast: true,
        successMessage: 'Tag created successfully',
      }),
  },

  // TMDB
  tmdb: {
    search: (query: string, enhanced = true) =>
      apiClient.post(API_ENDPOINTS.TMDB_SEARCH, { query, enhanced }),
    getMovie: (tmdbId: number) =>
      apiClient.get(API_ENDPOINTS.TMDB_MOVIE(tmdbId)),
    getWatchProviders: (tmdbId: number) =>
      apiClient.get(API_ENDPOINTS.TMDB_WATCH_PROVIDERS(tmdbId)),
    getTrailer: (tmdbId: number) =>
      apiClient.get(API_ENDPOINTS.TMDB_TRAILER(tmdbId)),
  },

  // Oscars
  oscars: {
    getAll: (params?: Record<string, string | number | boolean | undefined>) =>
      apiClient.get(API_ENDPOINTS.OSCARS, params),
    getYears: () => apiClient.get(API_ENDPOINTS.OSCAR_YEARS),
    getCategories: () => apiClient.get(API_ENDPOINTS.OSCAR_CATEGORIES),
    getNominations: (params?: Record<string, string | number | boolean | undefined>) =>
      apiClient.get(API_ENDPOINTS.OSCAR_NOMINATIONS, params),
  },
};
