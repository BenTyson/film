import { NextRequest } from 'next/server';

/**
 * Creates a mock NextRequest for testing API routes
 */
export function createMockRequest(options: {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  // NextRequest requires a stricter RequestInit type
  return new NextRequest(urlObj.toString(), requestInit as RequestInit & { signal?: AbortSignal });
}

/**
 * Helper to parse NextResponse JSON
 */
export async function parseResponse(response: Response) {
  return {
    status: response.status,
    data: await response.json(),
  };
}

/**
 * Mock authenticated user for testing
 */
export const mockUser = {
  id: 1,
  clerk_id: 'test-clerk-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user' as const,
  created_at: new Date(),
  updated_at: new Date(),
};

/**
 * Mock admin user for testing
 */
export const mockAdmin = {
  ...mockUser,
  id: 2,
  clerk_id: 'admin-clerk-id',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin' as const,
};
