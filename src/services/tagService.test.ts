import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTags,
  createTag,
  addTagsToMovie,
  removeTagsFromMovie,
  setMovieTags,
  filterMoodTags,
  type Tag,
} from './tagService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console.error
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('tagService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getTags', () => {
    it('returns tags on success', async () => {
      const mockTags = [
        { id: 1, name: 'Action', color: '#ff0000', icon: 'sword' },
        { id: 2, name: 'Drama', color: '#0000ff', icon: 'palette' },
      ];

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockTags }),
      });

      const result = await getTags();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTags);
    });

    it('returns error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Server error' }),
      });

      const result = await getTags();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getTags();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch tags');
    });
  });

  describe('createTag', () => {
    it('creates tag with provided values', async () => {
      const newTag = { id: 1, name: 'Horror', color: '#000000', icon: 'ghost' };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: newTag }),
      });

      const result = await createTag({
        name: 'Horror',
        color: '#000000',
        icon: 'ghost',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(newTag);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.name).toBe('Horror');
      expect(callBody.color).toBe('#000000');
      expect(callBody.icon).toBe('ghost');
    });

    it('uses default values when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      await createTag({ name: 'NewTag' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.name).toBe('NewTag');
      expect(callBody.color).toBe('#6366f1'); // default
      expect(callBody.icon).toBe('tag'); // default
    });

    it('returns error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Tag already exists' }),
      });

      const result = await createTag({ name: 'Existing' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tag already exists');
    });
  });

  describe('addTagsToMovie', () => {
    it('adds tags successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await addTagsToMovie(1, ['Action', 'Thriller']);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ tags: ['Action', 'Thriller'] }),
        })
      );
    });

    it('returns error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Movie not found' }),
      });

      const result = await addTagsToMovie(999, ['Action']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Movie not found');
    });
  });

  describe('removeTagsFromMovie', () => {
    it('removes tags successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await removeTagsFromMovie(1, ['Action']);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ tags: ['Action'] }),
        })
      );
    });

    it('returns error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Tag not found' }),
      });

      const result = await removeTagsFromMovie(1, ['NonExistent']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tag not found');
    });
  });

  describe('setMovieTags', () => {
    it('sets tags successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await setMovieTags(1, ['Drama', 'Romance']);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ tags: ['Drama', 'Romance'] }),
        })
      );
    });

    it('clears tags when empty array', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      });

      const result = await setMovieTags(1, []);

      expect(result.success).toBe(true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.tags).toEqual([]);
    });
  });

  describe('filterMoodTags', () => {
    const allTags: Tag[] = [
      { id: 1, name: 'Morgan', color: '#ff0000', icon: 'user', user_id: 1 },
      { id: 2, name: 'Liam', color: '#00ff00', icon: 'user', user_id: 1 },
      { id: 3, name: 'Epic', color: '#0000ff', icon: 'sword', user_id: 1 },
      { id: 4, name: 'Scary', color: '#000000', icon: 'ghost', user_id: 1 },
      { id: 5, name: 'Indie', color: '#ffff00', icon: 'palette', user_id: 1 },
      { id: 6, name: 'Action', color: '#ff00ff', icon: 'sword', user_id: 1 },
      { id: 7, name: 'Drama', color: '#00ffff', icon: 'palette', user_id: 1 },
    ];

    it('filters to default mood tags', () => {
      const result = filterMoodTags(allTags);

      expect(result).toHaveLength(5);
      expect(result.map(t => t.name)).toEqual(['Morgan', 'Liam', 'Epic', 'Scary', 'Indie']);
    });

    it('filters to custom mood tags', () => {
      const result = filterMoodTags(allTags, ['Action', 'Drama']);

      expect(result).toHaveLength(2);
      expect(result.map(t => t.name)).toEqual(['Action', 'Drama']);
    });

    it('returns empty array when no matches', () => {
      const result = filterMoodTags(allTags, ['NonExistent']);

      expect(result).toHaveLength(0);
    });

    it('handles empty input array', () => {
      const result = filterMoodTags([]);

      expect(result).toHaveLength(0);
    });
  });
});
