import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all watchlist movies with optional tag filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    const where = tagId
      ? {
          tags: {
            some: {
              tag_id: parseInt(tagId),
            },
          },
        }
      : {};

    const watchlistMovies = await prisma.watchlistMovie.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
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

    // Check if movie already exists in watchlist
    const existingMovie = await prisma.watchlistMovie.findUnique({
      where: { tmdb_id },
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
    const watchlistMovie = await prisma.watchlistMovie.create({
      data: {
        tmdb_id,
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
        tags: {
          create: (tag_ids || []).map((tagId: number) => ({
            tag_id: tagId,
          })),
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
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
