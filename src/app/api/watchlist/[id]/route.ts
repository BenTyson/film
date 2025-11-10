import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// GET single watchlist movie
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    const { id: paramId } = await params;
    const movieId = parseInt(paramId);

    if (isNaN(movieId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid movie ID',
        },
        { status: 400 }
      );
    }

    const watchlistMovie = await prisma.watchlistMovie.findFirst({
      where: {
        id: movieId,
        user_id: user.id, // Ensure user owns this watchlist movie
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!watchlistMovie) {
      return NextResponse.json(
        {
          success: false,
          error: 'Watchlist movie not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: watchlistMovie,
    });
  } catch (error) {
    console.error('Error fetching watchlist movie:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch watchlist movie',
      },
      { status: 500 }
    );
  }
}

// PATCH - Update watchlist movie tags
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    const { id: paramId } = await params;
    const movieId = parseInt(paramId);

    if (isNaN(movieId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid movie ID',
        },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingMovie = await prisma.watchlistMovie.findFirst({
      where: {
        id: movieId,
        user_id: user.id,
      },
    });

    if (!existingMovie) {
      return NextResponse.json(
        {
          success: false,
          error: 'Watchlist movie not found',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { tag_ids } = body;

    if (!Array.isArray(tag_ids)) {
      return NextResponse.json(
        {
          success: false,
          error: 'tag_ids must be an array',
        },
        { status: 400 }
      );
    }

    // Delete existing tags and create new ones
    await prisma.watchlistTag.deleteMany({
      where: { watchlist_movie_id: movieId },
    });

    const updatedMovie = await prisma.watchlistMovie.update({
      where: { id: movieId },
      data: {
        tags: {
          create: tag_ids.map((tagId: number) => ({
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
      data: updatedMovie,
    });
  } catch (error) {
    console.error('Error updating watchlist movie:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update watchlist movie',
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove movie from watchlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    const { id: paramId } = await params;
    const movieId = parseInt(paramId);

    if (isNaN(movieId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid movie ID',
        },
        { status: 400 }
      );
    }

    // Verify ownership before deleting
    const existingMovie = await prisma.watchlistMovie.findFirst({
      where: {
        id: movieId,
        user_id: user.id,
      },
    });

    if (!existingMovie) {
      return NextResponse.json(
        {
          success: false,
          error: 'Watchlist movie not found',
        },
        { status: 404 }
      );
    }

    await prisma.watchlistMovie.delete({
      where: { id: movieId },
    });

    return NextResponse.json({
      success: true,
      message: 'Movie removed from watchlist',
    });
  } catch (error) {
    console.error('Error deleting watchlist movie:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete watchlist movie',
      },
      { status: 500 }
    );
  }
}
