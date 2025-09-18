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
    const { approved_by = 'Ben' } = body;

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

    if (movie.approval_status === 'approved') {
      return NextResponse.json(
        { success: false, error: 'Movie is already approved' },
        { status: 400 }
      );
    }

    // Approve the movie
    const updatedMovie = await prisma.movie.update({
      where: { id: movieId },
      data: {
        approval_status: 'approved',
        approved_at: new Date(),
        approved_by: approved_by,
        updated_at: new Date()
      },
      include: {
        match_analysis: true
      }
    });

    // Convert BigInt fields to strings for JSON serialization
    const serializedMovie = {
      ...updatedMovie,
      id: Number(updatedMovie.id),
      budget: updatedMovie.budget ? Number(updatedMovie.budget) : null,
      revenue: updatedMovie.revenue ? Number(updatedMovie.revenue) : null,
      created_at: updatedMovie.created_at?.toISOString(),
      updated_at: updatedMovie.updated_at?.toISOString(),
      approved_at: updatedMovie.approved_at?.toISOString(),
      match_analysis: updatedMovie.match_analysis ? {
        ...updatedMovie.match_analysis,
        id: Number(updatedMovie.match_analysis.id),
        movie_id: Number(updatedMovie.match_analysis.movie_id),
        created_at: updatedMovie.match_analysis.created_at?.toISOString(),
        updated_at: updatedMovie.match_analysis.updated_at?.toISOString()
      } : null
    };

    return NextResponse.json({
      success: true,
      data: {
        movie: serializedMovie,
        message: `Movie "${movie.title}" approved successfully`
      }
    });

  } catch (error) {
    console.error('Error approving movie:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve movie' },
      { status: 500 }
    );
  }
}

// Get approval status for a movie
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid movie ID' },
        { status: 400 }
      );
    }

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: {
        id: true,
        title: true,
        approval_status: true,
        approved_at: true,
        approved_by: true
      }
    });

    if (!movie) {
      return NextResponse.json(
        { success: false, error: 'Movie not found' },
        { status: 404 }
      );
    }

    // Convert BigInt fields to strings for JSON serialization
    const serializedMovie = {
      ...movie,
      id: Number(movie.id),
      approved_at: movie.approved_at?.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: serializedMovie
    });

  } catch (error) {
    console.error('Error fetching approval status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch approval status' },
      { status: 500 }
    );
  }
}