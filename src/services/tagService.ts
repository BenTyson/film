/**
 * Tag Service
 * Centralized API interactions for tag management
 */

import { API_ENDPOINTS } from '@/lib/constants';

export interface Tag {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  user_id: number | null;
}

export interface CreateTagInput {
  name: string;
  color?: string;
  icon?: string;
}

export interface TagServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetch all tags for the current user
 */
export async function getTags(): Promise<TagServiceResult<Tag[]>> {
  try {
    const response = await fetch(API_ENDPOINTS.TAGS);
    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to fetch tags' };
  } catch (error) {
    console.error('Error fetching tags:', error);
    return { success: false, error: 'Failed to fetch tags' };
  }
}

/**
 * Create a new tag
 */
export async function createTag(input: CreateTagInput): Promise<TagServiceResult<Tag>> {
  try {
    const response = await fetch(API_ENDPOINTS.TAGS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        color: input.color || '#6366f1',
        icon: input.icon || 'tag',
      }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    }

    return { success: false, error: data.error || 'Failed to create tag' };
  } catch (error) {
    console.error('Error creating tag:', error);
    return { success: false, error: 'Failed to create tag' };
  }
}

/**
 * Add tags to a movie
 */
export async function addTagsToMovie(
  movieId: number,
  tagNames: string[]
): Promise<TagServiceResult<void>> {
  try {
    const response = await fetch(API_ENDPOINTS.MOVIE_TAGS(movieId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: tagNames }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    }

    return { success: false, error: data.error || 'Failed to add tags' };
  } catch (error) {
    console.error('Error adding tags:', error);
    return { success: false, error: 'Failed to add tags' };
  }
}

/**
 * Remove tags from a movie
 */
export async function removeTagsFromMovie(
  movieId: number,
  tagNames: string[]
): Promise<TagServiceResult<void>> {
  try {
    const response = await fetch(API_ENDPOINTS.MOVIE_TAGS(movieId), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: tagNames }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    }

    return { success: false, error: data.error || 'Failed to remove tags' };
  } catch (error) {
    console.error('Error removing tags:', error);
    return { success: false, error: 'Failed to remove tags' };
  }
}

/**
 * Set tags for a movie (replaces existing tags)
 */
export async function setMovieTags(
  movieId: number,
  tagNames: string[]
): Promise<TagServiceResult<void>> {
  try {
    const response = await fetch(API_ENDPOINTS.MOVIE_TAGS(movieId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: tagNames }),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    }

    return { success: false, error: data.error || 'Failed to set tags' };
  } catch (error) {
    console.error('Error setting tags:', error);
    return { success: false, error: 'Failed to set tags' };
  }
}

/**
 * Filter tags by mood tags (commonly used for watchlist)
 */
export function filterMoodTags(
  tags: Tag[],
  moodTagNames: string[] = ['Morgan', 'Liam', 'Epic', 'Scary', 'Indie']
): Tag[] {
  return tags.filter((tag) => moodTagNames.includes(tag.name));
}
