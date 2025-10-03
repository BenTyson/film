import { prisma } from '@/lib/prisma';
import { tmdb } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';

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
    const { tmdb_id } = body;

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

    // Update the Oscar movie with new TMDB data
    const updatedOscarMovie = await prisma.oscarMovie.update({
      where: { id: oscarMovieId },
      data: {
        tmdb_id: tmdbMovie.id,
        imdb_id: tmdbMovie.imdb_id || null,
        title: tmdbMovie.title,
      }
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

    const oscarMovie = await prisma.oscarMovie.findUnique({
      where: { id: oscarMovieId },
      include: {
        nominations: {
          include: {
            category: true
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
