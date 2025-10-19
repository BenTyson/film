import { NextRequest, NextResponse } from 'next/server';
import { tmdb } from '@/lib/tmdb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ movieId: string }> }
) {
  try {
    const { movieId } = await params;
    const id = parseInt(movieId);

    if (!id || isNaN(id)) {
      return NextResponse.json({
        success: false,
        error: 'Valid movie ID is required'
      }, { status: 400 });
    }

    // Fetch videos from TMDB
    const videosResponse = await tmdb.getMovieVideos(id);

    // Find the best trailer
    const bestTrailer = tmdb.findBestTrailer(videosResponse.results);

    if (!bestTrailer) {
      return NextResponse.json({
        success: true,
        data: null
      });
    }

    // Return trailer with YouTube URLs
    const trailerData = {
      key: bestTrailer.key,
      name: bestTrailer.name,
      type: bestTrailer.type,
      site: bestTrailer.site,
      official: bestTrailer.official,
      youtube_url: tmdb.getYouTubeURL(bestTrailer.key),
      embed_url: tmdb.getYouTubeEmbedURL(bestTrailer.key),
      thumbnail_url: tmdb.getYouTubeThumbnailURL(bestTrailer.key),
    };

    return NextResponse.json({
      success: true,
      data: trailerData
    });

  } catch (error) {
    console.error('Error fetching trailer:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trailer from TMDB'
    }, { status: 500 });
  }
}
