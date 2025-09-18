import { prisma } from '@/lib/prisma';
import { tmdb } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movieId = parseInt(params.id);

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

    return NextResponse.json({
      success: true,
      data: {
        ...movie,
        trailer: trailerData
      }
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
    const movieId = parseInt(params.id);
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