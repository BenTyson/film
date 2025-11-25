import { describe, it, expect } from 'vitest';
import {
  APIResponseBuilder,
  isSuccessResponse,
  isErrorResponse,
  unwrapResponse,
  type APIResponse,
  type ValidationError,
} from './api-response';
import { HTTP_STATUS } from './constants';

describe('APIResponseBuilder', () => {
  describe('success', () => {
    it('should create a success response with data', async () => {
      const data = { movies: [], total: 0 };
      const response = APIResponseBuilder.success(data);

      expect(response.status).toBe(HTTP_STATUS.OK);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });

    it('should support custom status codes', async () => {
      const response = APIResponseBuilder.success({ id: 1 }, HTTP_STATUS.CREATED);
      expect(response.status).toBe(HTTP_STATUS.CREATED);
    });
  });

  describe('error', () => {
    it('should create an error response with message', async () => {
      const response = APIResponseBuilder.error('Something went wrong');

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Something went wrong');
      expect(json.timestamp).toBeDefined();
    });

    it('should include details when provided', async () => {
      const details = { code: 'ERR_001' };
      const response = APIResponseBuilder.error('Error', 500, details);

      const json = await response.json();
      expect(json.details).toEqual(details);
    });
  });

  describe('badRequest', () => {
    it('should create a 400 response', async () => {
      const response = APIResponseBuilder.badRequest('Invalid input');

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Invalid input');
    });

    it('should include validation errors', async () => {
      const validation: ValidationError[] = [
        { field: 'email', message: 'Invalid email format' },
      ];
      const response = APIResponseBuilder.badRequest('Validation failed', validation);

      const json = await response.json();
      expect(json.details).toEqual(validation);
    });
  });

  describe('unauthorized', () => {
    it('should create a 401 response', async () => {
      const response = APIResponseBuilder.unauthorized();

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('logged in');
    });
  });

  describe('forbidden', () => {
    it('should create a 403 response', async () => {
      const response = APIResponseBuilder.forbidden();

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('permission');
    });
  });

  describe('notFound', () => {
    it('should create a 404 response', async () => {
      const response = APIResponseBuilder.notFound('Movie not found');

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Movie not found');
    });
  });

  describe('conflict', () => {
    it('should create a 409 response', async () => {
      const response = APIResponseBuilder.conflict('Movie already exists');

      expect(response.status).toBe(HTTP_STATUS.CONFLICT);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Movie already exists');
    });
  });

  describe('created', () => {
    it('should create a 201 response', async () => {
      const data = { id: 1, title: 'New Movie' };
      const response = APIResponseBuilder.created(data);

      expect(response.status).toBe(HTTP_STATUS.CREATED);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });
  });

  describe('noContent', () => {
    it('should create a 204 response with no body', () => {
      const response = APIResponseBuilder.noContent();
      expect(response.status).toBe(HTTP_STATUS.NO_CONTENT);
      expect(response.body).toBeNull();
    });
  });

  describe('databaseError', () => {
    it('should create a database error response', async () => {
      const response = APIResponseBuilder.databaseError();

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Database');
    });
  });

  describe('tmdbError', () => {
    it('should create a TMDB error response', async () => {
      const response = APIResponseBuilder.tmdbError();

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('TMDB');
    });
  });
});

describe('Type Guards', () => {
  describe('isSuccessResponse', () => {
    it('should return true for success responses', () => {
      const response: APIResponse = { success: true, data: { test: 1 } };
      expect(isSuccessResponse(response)).toBe(true);
    });

    it('should return false for error responses', () => {
      const response: APIResponse = { success: false, error: 'Error' };
      expect(isSuccessResponse(response)).toBe(false);
    });
  });

  describe('isErrorResponse', () => {
    it('should return true for error responses', () => {
      const response: APIResponse = { success: false, error: 'Error' };
      expect(isErrorResponse(response)).toBe(true);
    });

    it('should return false for success responses', () => {
      const response: APIResponse = { success: true, data: {} };
      expect(isErrorResponse(response)).toBe(false);
    });
  });

  describe('unwrapResponse', () => {
    it('should return data for success responses', () => {
      const data = { test: 1 };
      const response: APIResponse = { success: true, data };
      expect(unwrapResponse(response)).toEqual(data);
    });

    it('should throw error for error responses', () => {
      const response: APIResponse = { success: false, error: 'Something failed' };
      expect(() => unwrapResponse(response)).toThrow('Something failed');
    });
  });
});
