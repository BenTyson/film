import { prisma } from '@/lib/prisma';
import { tmdb } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';
import { ReviewStatus } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const oscarMovieId = parseInt(paramId);

    if (isNaN(oscarMovieId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Oscar movie ID'
      }, { status: 400 });
    }

    const body = await request.json();
    const { tmdb_id, review_status, verification_notes, reviewed_by } = body as {
      tmdb_id: number;
      review_status?: ReviewStatus;
      verification_notes?: string | null;
      reviewed_by?: string;
    };

    if (!tmdb_id || typeof tmdb_id !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Valid TMDB ID is required'
      }, { status: 400 });
    }

    // Fetch movie details from TMDB
    const tmdbMovie = await tmdb.getMovieDetails(tmdb_id);

    if (!tmdbMovie) {
      return NextResponse.json({
        success: false,
        error: 'Movie not found in TMDB'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: {
      tmdb_id: number;
      imdb_id: string | null;
      title: string;
      review_status?: ReviewStatus;
      verification_notes?: string | null;
      reviewed_at?: Date;
      reviewed_by?: string;
    } = {
      tmdb_id: tmdbMovie.id,
      imdb_id: tmdbMovie.imdb_id || null,
      title: tmdbMovie.title,
    };

    // Add review tracking fields if provided
    if (review_status) {
      updateData.review_status = review_status;
      updateData.reviewed_at = new Date();
    }
    if (verification_notes !== undefined) {
      updateData.verification_notes = verification_notes;
    }
    if (reviewed_by) {
      updateData.reviewed_by = reviewed_by;
    }

    // Update the Oscar movie with new TMDB data
    const updatedOscarMovie = await prisma.oscar_movies.update({
      where: { id: oscarMovieId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: updatedOscarMovie
    });

  } catch (error) {
    console.error('Error updating Oscar movie:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update Oscar movie'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const oscarMovieId = parseInt(paramId);

    if (isNaN(oscarMovieId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Oscar movie ID'
      }, { status: 400 });
    }

    const oscarMovie = await prisma.oscar_movies.findUnique({
      where: { id: oscarMovieId },
      include: {
        oscar_nominations: {
          include: {
            oscar_categories: true
          }
        }
      }
    });

    if (!oscarMovie) {
      return NextResponse.json({
        success: false,
        error: 'Oscar movie not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: oscarMovie
    });

  } catch (error) {
    console.error('Error fetching Oscar movie:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Oscar movie'
    }, { status: 500 });
  }
}
