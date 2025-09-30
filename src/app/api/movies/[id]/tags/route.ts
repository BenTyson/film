import { prisma, checkDatabaseHealth } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// Request timeout configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

// Database operation wrapper with timeout and retry logic
async function withDatabaseRetry<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Check database health before operation
      const health = await checkDatabaseHealth();
      if (!health.healthy && attempt === 1) {
        console.warn('Database health check failed, proceeding with operation');
      }

      // Wrap operation with timeout
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Database operation timeout')), REQUEST_TIMEOUT)
        )
      ]);
    } catch (error) {
      lastError = error;
      console.error(`Database operation attempt ${attempt} failed:`, error);

      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid movie ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { tags } = body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tags array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Verify movie exists
    const movie = await withDatabaseRetry(() =>
      prisma.movie.findUnique({
        where: { id: movieId },
        select: { id: true, title: true }
      })
    );

    if (!movie) {
      return NextResponse.json(
        { success: false, error: 'Movie not found' },
        { status: 404 }
      );
    }

    // Process each tag
    const addedTags = [];

    for (const tagName of tags) {
      if (typeof tagName !== 'string' || tagName.trim().length === 0) {
        continue; // Skip invalid tag names
      }

      const normalizedTagName = tagName.trim();

      // Find or create tag
      let tag = await withDatabaseRetry(() =>
        prisma.tag.findUnique({
          where: { name: normalizedTagName }
        })
      );

      if (!tag) {
        // Create tag with default styling for Calen
        const defaultColor = normalizedTagName.toLowerCase() === 'calen' ? '#8B5CF6' : '#6366f1';
        const defaultIcon = normalizedTagName.toLowerCase() === 'calen' ? 'Users' : 'Tag';

        tag = await withDatabaseRetry(() =>
          prisma.tag.create({
            data: {
              name: normalizedTagName,
              color: defaultColor,
              icon: defaultIcon
            }
          })
        );
      }

      // Check if movie-tag relationship already exists
      const existingMovieTag = await withDatabaseRetry(() =>
        prisma.movieTag.findUnique({
          where: {
            movie_id_tag_id: {
              movie_id: movieId,
              tag_id: tag.id
            }
          }
        })
      );

      if (!existingMovieTag) {
        // Create movie-tag relationship
        await withDatabaseRetry(() =>
          prisma.movieTag.create({
            data: {
              movie_id: movieId,
              tag_id: tag.id
            }
          })
        );

        addedTags.push({
          id: tag.id,
          name: tag.name,
          color: tag.color,
          icon: tag.icon
        });
      }
    }

    // Get updated movie with all tags
    const updatedMovie = await withDatabaseRetry(() =>
      prisma.movie.findUnique({
        where: { id: movieId },
        include: {
          movie_tags: {
            include: {
              tag: true
            }
          }
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        movieId: movieId,
        movieTitle: movie.title,
        addedTags: addedTags,
        allTags: updatedMovie?.movie_tags.map(mt => ({
          id: mt.tag.id,
          name: mt.tag.name,
          color: mt.tag.color,
          icon: mt.tag.icon
        })) || [],
        message: `Successfully added ${addedTags.length} tag(s) to "${movie.title}"`
      }
    });

  } catch (error) {
    console.error('Error adding tags to movie:', error);

    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to add tags to movie';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout - the server is taking too long to respond';
        statusCode = 408;
      } else if (error.message.includes('connection')) {
        errorMessage = 'Database connection error - please try again';
        statusCode = 503;
      } else if (error.message.includes('SQLITE_BUSY')) {
        errorMessage = 'Database is busy - please try again in a moment';
        statusCode = 503;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    }, { status: statusCode });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid movie ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { tags } = body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tags array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Verify movie exists
    const movie = await withDatabaseRetry(() =>
      prisma.movie.findUnique({
        where: { id: movieId },
        select: { id: true, title: true }
      })
    );

    if (!movie) {
      return NextResponse.json(
        { success: false, error: 'Movie not found' },
        { status: 404 }
      );
    }

    // Process each tag for removal
    const removedTags = [];

    for (const tagName of tags) {
      if (typeof tagName !== 'string' || tagName.trim().length === 0) {
        continue; // Skip invalid tag names
      }

      const normalizedTagName = tagName.trim();

      // Find tag
      const tag = await withDatabaseRetry(() =>
        prisma.tag.findUnique({
          where: { name: normalizedTagName }
        })
      );

      if (tag) {
        // Remove movie-tag relationship if it exists
        const deletedMovieTag = await withDatabaseRetry(() =>
          prisma.movieTag.deleteMany({
            where: {
              movie_id: movieId,
              tag_id: tag.id
            }
          })
        );

        if (deletedMovieTag.count > 0) {
          removedTags.push({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            icon: tag.icon
          });
        }
      }
    }

    // Get updated movie with all remaining tags
    const updatedMovie = await withDatabaseRetry(() =>
      prisma.movie.findUnique({
        where: { id: movieId },
        include: {
          movie_tags: {
            include: {
              tag: true
            }
          }
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        movieId: movieId,
        movieTitle: movie.title,
        removedTags: removedTags,
        remainingTags: updatedMovie?.movie_tags.map(mt => ({
          id: mt.tag.id,
          name: mt.tag.name,
          color: mt.tag.color,
          icon: mt.tag.icon
        })) || [],
        message: `Successfully removed ${removedTags.length} tag(s) from "${movie.title}"`
      }
    });

  } catch (error) {
    console.error('Error removing tags from movie:', error);

    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to remove tags from movie';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout - the server is taking too long to respond';
        statusCode = 408;
      } else if (error.message.includes('connection')) {
        errorMessage = 'Database connection error - please try again';
        statusCode = 503;
      } else if (error.message.includes('SQLITE_BUSY')) {
        errorMessage = 'Database is busy - please try again in a moment';
        statusCode = 503;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    }, { status: statusCode });
  }
}