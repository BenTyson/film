import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const movieId = parseInt(id);
    const body = await request.json();
    const { removed_by = 'Ben', reason = 'Not wanted in collection' } = body;

    if (isNaN(movieId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid movie ID' },
        { status: 400 }
      );
    }

    // Check if movie exists
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: { id: true, approval_status: true, title: true }
    });

    if (!movie) {
      return NextResponse.json(
        { success: false, error: 'Movie not found' },
        { status: 404 }
      );
    }

    if (movie.approval_status === 'removed') {
      return NextResponse.json(
        { success: false, error: 'Movie is already removed' },
        { status: 400 }
      );
    }

    // Remove the movie (mark as removed)
    const updatedMovie = await prisma.movie.update({
      where: { id: movieId },
      data: {
        approval_status: 'removed',
        approved_at: new Date(),
        approved_by: removed_by,
        updated_at: new Date()
      }
    });

    // Convert BigInt fields for JSON serialization
    const serializedMovie = {
      ...updatedMovie,
      id: Number(updatedMovie.id),
      budget: updatedMovie.budget ? Number(updatedMovie.budget) : null,
      revenue: updatedMovie.revenue ? Number(updatedMovie.revenue) : null,
      created_at: updatedMovie.created_at?.toISOString(),
      updated_at: updatedMovie.updated_at?.toISOString(),
      approved_at: updatedMovie.approved_at?.toISOString(),
      release_date: updatedMovie.release_date?.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: {
        movie: serializedMovie,
        message: `Movie "${movie.title}" removed from collection`
      }
    });

  } catch (error) {
    console.error('Error removing movie:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove movie' },
      { status: 500 }
    );
  }
}