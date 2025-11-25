/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIClient, APIClientError } from './api-client';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('APIClient', () => {
  let client: APIClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new APIClient();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET requests', () => {
    it('should make a successful GET request', async () => {
      const mockData = { movies: [], total: 0 };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await client.get('/api/movies');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/movies',
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(mockData);
    });

    it('should handle query parameters', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await client.get('/api/movies', { year: 2024, search: 'test' });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/movies?year=2024&search=test',
        expect.any(Object)
      );
    });

    it('should skip undefined parameters', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await client.get('/api/movies', { year: 2024, search: undefined });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/movies?year=2024',
        expect.any(Object)
      );
    });
  });

  describe('POST requests', () => {
    it('should make a successful POST request', async () => {
      const mockData = { id: 1, title: 'Test Movie' };
      const requestBody = { tmdb_id: 123, title: 'Test Movie' };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await client.post('/api/movies', requestBody);

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/movies',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('PATCH requests', () => {
    it('should make a successful PATCH request', async () => {
      const mockData = { id: 1, title: 'Updated Movie' };
      const requestBody = { title: 'Updated Movie' };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await client.patch('/api/movies/1', requestBody);

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/movies/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(requestBody),
        })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('DELETE requests', () => {
    it('should make a successful DELETE request', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { deleted: true } }),
      });

      const result = await client.delete('/api/movies/1');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/movies/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('Error handling', () => {
    it('should throw APIClientError on API error response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({
          success: false,
          error: 'Movie not found',
        }),
      } as any);

      await expect(client.get('/api/movies/999')).rejects.toThrow(APIClientError);

      // Reset for second call
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({
          success: false,
          error: 'Movie not found',
        }),
      } as any);

      await expect(client.get('/api/movies/999')).rejects.toThrow('Movie not found');
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(client.get('/api/movies')).rejects.toThrow(APIClientError);
      await expect(client.get('/api/movies')).rejects.toThrow('Network error');
    });

    it('should handle timeout', async () => {
      const slowClient = new APIClient({ timeout: 100 });

      // Mock a slow response that takes longer than timeout
      fetchMock.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new DOMException('The operation was aborted', 'AbortError'));
            }, 50);
          })
      );

      await expect(slowClient.get('/api/movies')).rejects.toThrow('Request timeout');
    });
  });

  describe('Custom headers', () => {
    it('should include custom headers', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await client.get('/api/movies', undefined, {
        headers: { Authorization: 'Bearer token' },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/movies',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
          }),
        })
      );
    });
  });

  describe('Toast notifications', () => {
    it('should not show success toast by default', async () => {
      const { toast } = await import('sonner');

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await client.get('/api/movies');

      expect(toast.success).not.toHaveBeenCalled();
    });

    it('should show success toast when enabled', async () => {
      const { toast } = await import('sonner');

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await client.get('/api/movies', undefined, {
        showSuccessToast: true,
        successMessage: 'Movies loaded!',
      });

      expect(toast.success).toHaveBeenCalledWith('Movies loaded!');
    });

    it('should show error toast by default', async () => {
      const { toast } = await import('sonner');

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Server error',
        }),
      });

      await expect(client.get('/api/movies')).rejects.toThrow();

      expect(toast.error).toHaveBeenCalledWith('Server error');
    });

    it('should allow disabling error toast', async () => {
      const { toast } = await import('sonner');

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Server error',
        }),
      });

      await expect(
        client.get('/api/movies', undefined, { showErrorToast: false })
      ).rejects.toThrow();

      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should use custom base URL', async () => {
      const customClient = new APIClient({ baseURL: 'https://api.example.com' });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await customClient.get('/movies');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/movies',
        expect.any(Object)
      );
    });

    it('should use custom default headers', async () => {
      const customClient = new APIClient({
        defaultHeaders: { 'X-Custom-Header': 'value' },
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await customClient.get('/movies');

      expect(fetchMock).toHaveBeenCalledWith(
        '/movies',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'value',
          }),
        })
      );
    });
  });
});
