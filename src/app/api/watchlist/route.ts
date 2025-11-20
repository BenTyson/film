import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// GET all watchlist movies with optional tag filter
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    const where: Prisma.watchlist_moviesWhereInput = {
      user_id: user.id, // Filter by current user
    };

    if (tagId) {
      where.watchlist_tags = {
        some: {
          tag_id: parseInt(tagId),
        },
      };
    }

    const watchlistMovies = await prisma.watchlist_movies.findMany({
      where,
      include: {
        watchlist_tags: {
          include: {
            tags: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: watchlistMovies,
    });
  } catch (error) {
    console.error('Error fetching watchlist movies:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch watchlist movies',
      },
      { status: 500 }
    );
  }
}

// POST - Add movie to watchlist
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    const body = await request.json();
    const { tmdb_id, title, director, release_date, poster_path, backdrop_path, overview, runtime, genres, vote_average, imdb_id, tag_ids } = body;

    if (!tmdb_id || !title) {
      return NextResponse.json(
        {
          success: false,
          error: 'TMDB ID and title are required',
        },
        { status: 400 }
      );
    }

    // Check if movie already exists in this user's watchlist
    const existingMovie = await prisma.watchlist_movies.findFirst({
      where: {
        tmdb_id,
        user_id: user.id,
      },
    });

    if (existingMovie) {
      return NextResponse.json(
        {
          success: false,
          error: 'Movie already exists in watchlist',
        },
        { status: 400 }
      );
    }

    // Create watchlist movie with tags
    const watchlistMovie = await prisma.watchlist_movies.create({
      data: {
        tmdb_id,
        user_id: user.id,
        title,
        director,
        release_date: release_date ? new Date(release_date) : null,
        poster_path,
        backdrop_path,
        overview,
        runtime,
        genres,
        vote_average,
        imdb_id,
        watchlist_tags: {
          create: (tag_ids || []).map((tagId: number) => ({
            tag_id: tagId,
            updated_at: new Date()
          })),
        },
        updated_at: new Date()
      },
      include: {
        watchlist_tags: {
          include: {
            tags: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: watchlistMovie,
    });
  } catch (error) {
    console.error('Error adding movie to watchlist:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add movie to watchlist',
      },
      { status: 500 }
    );
  }
}
