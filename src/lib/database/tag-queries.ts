/**
 * Tag Database Query Helpers
 * Provides optimized batch operations to avoid N+1 queries
 */

import { prisma } from '../prisma';

/**
 * Tag type for common operations
 */
export interface TagData {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  user_id: number | null;
}

/**
 * Get or create multiple tags in a single batch operation
 * Avoids N+1 queries when adding multiple tags to a movie
 *
 * @param tagNames - Array of tag names to find or create
 * @param userId - User ID for user-specific tags (null for global)
 * @returns Array of tag records
 */
export async function getOrCreateTags(
  tagNames: string[],
  userId: number | null = null
): Promise<TagData[]> {
  if (tagNames.length === 0) {
    return [];
  }

  // Find existing tags in a single query
  const existingTags = await prisma.tags.findMany({
    where: {
      name: { in: tagNames },
      user_id: userId,
    },
  });

  const existingNames = new Set(existingTags.map((t) => t.name));
  const missingNames = tagNames.filter((name) => !existingNames.has(name));

  // Create missing tags in batch
  if (missingNames.length > 0) {
    await prisma.tags.createMany({
      data: missingNames.map((name) => ({
        name,
        user_id: userId,
        updated_at: new Date(),
      })),
      skipDuplicates: true,
    });

    // Fetch newly created tags
    const newTags = await prisma.tags.findMany({
      where: {
        name: { in: missingNames },
        user_id: userId,
      },
    });

    return [...existingTags, ...newTags];
  }

  return existingTags;
}

/**
 * Set tags for a movie, replacing existing tags
 * Uses batch operations to avoid N+1 queries
 *
 * @param movieId - The movie ID
 * @param tagNames - Array of tag names to set
 * @param userId - User ID for user-specific tags
 */
export async function setMovieTags(
  movieId: number,
  tagNames: string[],
  userId: number
): Promise<void> {
  // Get or create all tags in batch
  const tags = await getOrCreateTags(tagNames, userId);
  const tagIds = tags.map((t) => t.id);

  // Use transaction to delete old and create new in one operation
  await prisma.$transaction([
    // Delete existing tags for this movie
    prisma.movie_tags.deleteMany({
      where: { movie_id: movieId },
    }),
    // Create new tag associations in batch
    prisma.movie_tags.createMany({
      data: tagIds.map((tagId) => ({
        movie_id: movieId,
        tag_id: tagId,
        updated_at: new Date(),
      })),
      skipDuplicates: true,
    }),
  ]);
}

/**
 * Add tags to a movie without removing existing ones
 * Uses batch operations to avoid N+1 queries
 *
 * @param movieId - The movie ID
 * @param tagNames - Array of tag names to add
 * @param userId - User ID for user-specific tags
 */
export async function addMovieTags(
  movieId: number,
  tagNames: string[],
  userId: number
): Promise<void> {
  // Get or create all tags in batch
  const tags = await getOrCreateTags(tagNames, userId);
  const tagIds = tags.map((t) => t.id);

  // Get existing tag associations
  const existingAssociations = await prisma.movie_tags.findMany({
    where: { movie_id: movieId },
    select: { tag_id: true },
  });

  const existingTagIds = new Set(existingAssociations.map((a) => a.tag_id));
  const newTagIds = tagIds.filter((id) => !existingTagIds.has(id));

  // Create only new associations in batch
  if (newTagIds.length > 0) {
    await prisma.movie_tags.createMany({
      data: newTagIds.map((tagId) => ({
        movie_id: movieId,
        tag_id: tagId,
        updated_at: new Date(),
      })),
      skipDuplicates: true,
    });
  }
}

/**
 * Remove tags from a movie
 * Uses batch operation
 *
 * @param movieId - The movie ID
 * @param tagNames - Array of tag names to remove
 */
export async function removeMovieTags(
  movieId: number,
  tagNames: string[]
): Promise<void> {
  if (tagNames.length === 0) {
    return;
  }

  await prisma.movie_tags.deleteMany({
    where: {
      movie_id: movieId,
      tags: {
        name: { in: tagNames },
      },
    },
  });
}

/**
 * Get all tags for a user (both global and user-specific)
 */
export async function getUserTags(userId: number): Promise<TagData[]> {
  return prisma.tags.findMany({
    where: {
      OR: [
        { user_id: null }, // Global tags
        { user_id: userId }, // User-specific tags
      ],
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get tags usage statistics
 */
export async function getTagStats(userId: number) {
  const tags = await prisma.tags.findMany({
    where: {
      OR: [{ user_id: null }, { user_id: userId }],
    },
    include: {
      _count: {
        select: {
          movie_tags: {
            where: {
              movies: {
                user_movies: {
                  some: { user_id: userId },
                },
              },
            },
          },
        },
      },
    },
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    icon: tag.icon,
    movieCount: tag._count.movie_tags,
  }));
}

/**
 * Batch update tags for multiple movies
 * Useful for bulk operations like import
 *
 * @param movieTagPairs - Array of { movieId, tagNames } pairs
 * @param userId - User ID for user-specific tags
 */
export async function batchSetMovieTags(
  movieTagPairs: Array<{ movieId: number; tagNames: string[] }>,
  userId: number
): Promise<void> {
  // Collect all unique tag names
  const allTagNames = [...new Set(movieTagPairs.flatMap((p) => p.tagNames))];

  // Get or create all tags in a single batch
  const allTags = await getOrCreateTags(allTagNames, userId);
  const tagMap = new Map(allTags.map((t) => [t.name, t.id]));

  // Prepare all movie-tag associations
  const allAssociations = movieTagPairs.flatMap(({ movieId, tagNames }) =>
    tagNames
      .map((name) => tagMap.get(name))
      .filter((tagId): tagId is number => tagId !== undefined)
      .map((tagId) => ({
        movie_id: movieId,
        tag_id: tagId,
        updated_at: new Date(),
      }))
  );

  // Get all movie IDs
  const movieIds = movieTagPairs.map((p) => p.movieId);

  // Use transaction for atomic operation
  await prisma.$transaction([
    // Delete existing tags for all movies
    prisma.movie_tags.deleteMany({
      where: { movie_id: { in: movieIds } },
    }),
    // Create all new associations in batch
    prisma.movie_tags.createMany({
      data: allAssociations,
      skipDuplicates: true,
    }),
  ]);
}
