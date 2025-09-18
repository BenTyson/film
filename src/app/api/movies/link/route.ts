import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tmdb_id,
      personal_rating,
      date_watched,
      is_favorite,
      buddy_watched_with,
      tags,
      notes
    } = body;

    if (!tmdb_id) {
      return NextResponse.json(
        { success: false, error: 'TMDB ID is required' },
        { status: 400 }
      );
    }

    // Check if movie exists
    const existingMovie = await prisma.movie.findUnique({
      where: { tmdb_id: parseInt(tmdb_id) },
      include: {
        user_movies: true
      }
    });

    if (!existingMovie) {
      return NextResponse.json(
        { success: false, error: 'Movie does not exist in collection' },
        { status: 404 }
      );
    }

    // Check if user already has a record for this movie
    const existingUserMovie = existingMovie.user_movies.find(um => um.user_id === 1);

    if (existingUserMovie) {
      // Update existing user movie record with new data if provided
      const updatedUserMovie = await prisma.userMovie.update({
        where: { id: existingUserMovie.id },
        data: {
          personal_rating: personal_rating ? parseInt(personal_rating) : existingUserMovie.personal_rating,
          date_watched: date_watched ? new Date(date_watched) : existingUserMovie.date_watched,
          is_favorite: is_favorite !== undefined ? is_favorite : existingUserMovie.is_favorite,
          buddy_watched_with: buddy_watched_with || existingUserMovie.buddy_watched_with,
          notes: notes || existingUserMovie.notes
        }
      });
    } else {
      // Create new user movie record
      await prisma.userMovie.create({
        data: {
          movie_id: existingMovie.id,
          user_id: 1, // Default user for now
          personal_rating: personal_rating ? parseInt(personal_rating) : null,
          date_watched: date_watched ? new Date(date_watched) : null,
          is_favorite: is_favorite || false,
          buddy_watched_with: buddy_watched_with || null,
          notes: notes || null
        }
      });
    }

    // Handle tags if provided
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Find or create tag
        let tag = await prisma.tag.findUnique({
          where: { name: tagName }
        });

        if (!tag) {
          tag = await prisma.tag.create({
            data: {
              name: tagName,
              color: tagName === 'Calen' ? '#3b82f6' : '#6366f1',
              icon: 'user'
            }
          });
        }

        // Check if movie-tag link already exists
        const existingMovieTag = await prisma.movieTag.findUnique({
          where: {
            movie_id_tag_id: {
              movie_id: existingMovie.id,
              tag_id: tag.id
            }
          }
        });

        if (!existingMovieTag) {
          // Link movie to tag
          await prisma.movieTag.create({
            data: {
              movie_id: existingMovie.id,
              tag_id: tag.id
            }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: existingMovie.id,
        tmdb_id: existingMovie.tmdb_id,
        title: existingMovie.title,
        message: 'Successfully linked to existing movie'
      }
    });

  } catch (error) {
    console.error('Error linking movie:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to link movie' },
      { status: 500 }
    );
  }
}