/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { withAuth, withAdmin, withPublic, compose, withRateLimit } from './api-middleware';
import { APIResponseBuilder } from './api-response';

// Mock dependencies
vi.mock('./auth', () => ({
  getCurrentUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('./prisma', () => ({
  prisma: {
    error_logs: {
      create: vi.fn(),
    },
    activity_logs: {
      create: vi.fn(),
    },
  },
}));

describe('API Middleware', () => {
  const mockUser = {
    id: 1,
    clerk_id: 'test-clerk-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    last_login_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAdminUser = {
    ...mockUser,
    id: 2,
    role: 'admin',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withAuth', () => {
    it('should pass user context to handler on successful auth', async () => {
      const { getCurrentUser } = await import('./auth');
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const handler = vi.fn().mockResolvedValue(
        APIResponseBuilder.success({ test: true })
      );

      const wrapped = withAuth(handler);
      const request = new NextRequest('http://localhost:3000/api/test');

      const response = await wrapped(request, {});

      expect(handler).toHaveBeenCalledWith({
        user: mockUser,
        request,
        params: undefined,
      });

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 401 when user is not authenticated', async () => {
      const { getCurrentUser } = await import('./auth');
      (getCurrentUser as any).mockRejectedValue(new Error('Unauthorized'));

      const handler = vi.fn();
      const wrapped = withAuth(handler);
      const request = new NextRequest('http://localhost:3000/api/test');

      const response = await wrapped(request, {});

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('should pass route params to handler', async () => {
      const { getCurrentUser } = await import('./auth');
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const handler = vi.fn().mockResolvedValue(
        APIResponseBuilder.success({ test: true })
      );

      const wrapped = withAuth(handler);
      const request = new NextRequest('http://localhost:3000/api/movies/123');
      const params = Promise.resolve({ id: '123' });

      await wrapped(request, { params });

      expect(handler).toHaveBeenCalledWith({
        user: mockUser,
        request,
        params: { id: '123' },
      });
    });
  });

  describe('withAdmin', () => {
    it('should pass admin user context to handler', async () => {
      const { requireAdmin } = await import('./auth');
      (requireAdmin as any).mockResolvedValue(mockAdminUser);

      const handler = vi.fn().mockResolvedValue(
        APIResponseBuilder.success({ admin: true })
      );

      const wrapped = withAdmin(handler);
      const request = new NextRequest('http://localhost:3000/api/admin/test');

      const response = await wrapped(request, {});

      expect(handler).toHaveBeenCalledWith({
        user: mockAdminUser,
        request,
        params: undefined,
      });

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 401 when user is not authenticated', async () => {
      const { requireAdmin } = await import('./auth');
      (requireAdmin as any).mockRejectedValue(new Error('Unauthorized'));

      const handler = vi.fn();
      const wrapped = withAdmin(handler);
      const request = new NextRequest('http://localhost:3000/api/admin/test');

      const response = await wrapped(request, {});

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      const { requireAdmin } = await import('./auth');
      (requireAdmin as any).mockRejectedValue(new Error('Forbidden: Admin access required'));

      const handler = vi.fn();
      const wrapped = withAdmin(handler);
      const request = new NextRequest('http://localhost:3000/api/admin/test');

      const response = await wrapped(request, {});

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('withPublic', () => {
    it('should allow access without authentication', async () => {
      const handler = vi.fn().mockResolvedValue(
        APIResponseBuilder.success({ public: true })
      );

      const wrapped = withPublic(handler);
      const request = new NextRequest('http://localhost:3000/api/public');

      const response = await wrapped(request, {});

      expect(handler).toHaveBeenCalledWith({
        request,
        params: undefined,
      });

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Something went wrong'));

      const wrapped = withPublic(handler);
      const request = new NextRequest('http://localhost:3000/api/public');

      const response = await wrapped(request, {});

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Something went wrong');
    });
  });

  describe('compose', () => {
    it('should compose multiple middlewares', async () => {
      const { getCurrentUser } = await import('./auth');
      (getCurrentUser as any).mockResolvedValue(mockUser);

      const callOrder: string[] = [];

      const middleware1 = (handler: any) => {
        return async (context: any) => {
          callOrder.push('middleware1-before');
          const response = await handler(context);
          callOrder.push('middleware1-after');
          return response;
        };
      };

      const middleware2 = (handler: any) => {
        return async (context: any) => {
          callOrder.push('middleware2-before');
          const response = await handler(context);
          callOrder.push('middleware2-after');
          return response;
        };
      };

      const handler = async () => {
        callOrder.push('handler');
        return APIResponseBuilder.success({ test: true });
      };

      const composed = compose(middleware1, middleware2)(handler);
      const wrapped = withAuth(composed);

      const request = new NextRequest('http://localhost:3000/api/test');
      await wrapped(request, {});

      // Middlewares applied right-to-left (outer to inner)
      expect(callOrder).toEqual([
        'middleware1-before',
        'middleware2-before',
        'handler',
        'middleware2-after',
        'middleware1-after',
      ]);
    });
  });

  describe('withRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      // Create a new response for each call
      const handler = vi.fn().mockImplementation(() =>
        APIResponseBuilder.success({ test: true })
      );

      const limited = withRateLimit({ windowMs: 60000, maxRequests: 5 })(handler);

      // Use unique user ID to avoid interference from other tests
      const context = {
        user: { ...mockUser, id: 100 },
        request: new NextRequest('http://localhost:3000/api/unique-test'),
        params: undefined,
      };

      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const response = await limited(context);
        expect(response.status).toBe(200);
      }

      expect(handler).toHaveBeenCalledTimes(5);
    });

    it('should block requests over rate limit', async () => {
      const handler = vi.fn().mockResolvedValue(
        APIResponseBuilder.success({ test: true })
      );

      // Use different endpoint to avoid test interference
      const limited = withRateLimit({ windowMs: 60000, maxRequests: 2 })(handler);

      const context = {
        user: { ...mockUser, id: 999 }, // Different user ID
        request: new NextRequest('http://localhost:3000/api/ratelimit-test'),
        params: undefined,
      };

      // First 2 should succeed
      await limited(context);
      await limited(context);

      // Third should be rate limited
      const response = await limited(context);
      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.error).toContain('Too many requests');
    });
  });
});
