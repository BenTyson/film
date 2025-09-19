import { prisma } from '@/lib/prisma';
import { tmdb } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid movie ID'
      }, { status: 400 });
    }

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        user_movies: {
          orderBy: { date_watched: 'desc' }
        },
        oscar_data: {
          orderBy: { ceremony_year: 'desc' }
        },
        movie_tags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!movie) {
      return NextResponse.json({
        success: false,
        error: 'Movie not found'
      }, { status: 404 });
    }

    // Fetch trailer data from TMDB
    let trailerData = null;
    try {
      const videosResponse = await tmdb.getMovieVideos(movie.tmdb_id);
      const bestTrailer = tmdb.findBestTrailer(videosResponse.results);

      if (bestTrailer) {
        trailerData = {
          key: bestTrailer.key,
          name: bestTrailer.name,
          type: bestTrailer.type,
          site: bestTrailer.site,
          official: bestTrailer.official,
          youtube_url: tmdb.getYouTubeURL(bestTrailer.key),
          embed_url: tmdb.getYouTubeEmbedURL(bestTrailer.key),
          thumbnail_url: tmdb.getYouTubeThumbnailURL(bestTrailer.key),
          all_trailers: videosResponse.results.filter(video =>
            video.site === 'YouTube' &&
            (video.type === 'Trailer' || video.type === 'Teaser')
          ).map(video => ({
            key: video.key,
            name: video.name,
            type: video.type,
            official: video.official,
            youtube_url: tmdb.getYouTubeURL(video.key),
            embed_url: tmdb.getYouTubeEmbedURL(video.key),
          }))
        };
      }
    } catch (error) {
      console.error('Error fetching trailer data:', error);
      // Continue without trailer data
    }

    // Convert BigInt fields to strings for JSON serialization
    const serializedMovie = {
      ...movie,
      id: Number(movie.id),
      budget: movie.budget ? Number(movie.budget) : null,
      revenue: movie.revenue ? Number(movie.revenue) : null,
      created_at: movie.created_at?.toISOString(),
      updated_at: movie.updated_at?.toISOString(),
      approved_at: movie.approved_at?.toISOString(),
      release_date: movie.release_date?.toISOString(),
      user_movies: movie.user_movies.map(um => ({
        ...um,
        id: Number(um.id),
        movie_id: Number(um.movie_id),
        user_id: Number(um.user_id),
        date_watched: um.date_watched?.toISOString(),
        created_at: um.created_at?.toISOString(),
        updated_at: um.updated_at?.toISOString()
      })),
      oscar_data: movie.oscar_data.map(od => ({
        ...od,
        id: Number(od.id),
        movie_id: Number(od.movie_id),
        created_at: od.created_at?.toISOString(),
        updated_at: od.updated_at?.toISOString()
      })),
      movie_tags: movie.movie_tags.map(mt => ({
        ...mt,
        id: Number(mt.id),
        movie_id: Number(mt.movie_id),
        tag_id: Number(mt.tag_id),
        created_at: mt.created_at?.toISOString(),
        updated_at: mt.updated_at?.toISOString(),
        tag: {
          ...mt.tag,
          id: Number(mt.tag.id),
          created_at: mt.tag.created_at?.toISOString(),
          updated_at: mt.tag.updated_at?.toISOString()
        }
      })),
      trailer: trailerData
    };

    return NextResponse.json({
      success: true,
      data: serializedMovie
    });

  } catch (error) {
    console.error('Error fetching movie details:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch movie details'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const movieId = parseInt(id);
    const body = await request.json();

    if (isNaN(movieId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid movie ID'
      }, { status: 400 });
    }

    const {
      user_movie_id,
      personal_rating,
      notes,
      is_favorite,
      watch_location,
      date_watched
    } = body;

    // Update the user movie record
    const updatedUserMovie = await prisma.userMovie.update({
      where: { id: user_movie_id },
      data: {
        ...(personal_rating !== undefined && { personal_rating }),
        ...(notes !== undefined && { notes }),
        ...(is_favorite !== undefined && { is_favorite }),
        ...(watch_location !== undefined && { watch_location }),
        ...(date_watched !== undefined && { date_watched: new Date(date_watched) }),
        updated_at: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedUserMovie
    });

  } catch (error) {
    console.error('Error updating movie:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update movie'
    }, { status: 500 });
  }
}