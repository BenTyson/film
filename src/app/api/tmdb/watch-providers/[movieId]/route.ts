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

    // Fetch watch providers from TMDB (defaults to US region)
    const watchProvidersData = await tmdb.getWatchProviders(id);

    return NextResponse.json({
      success: true,
      data: watchProvidersData
    });

  } catch (error) {
    console.error('Error fetching watch providers:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch watch providers from TMDB'
    }, { status: 500 });
  }
}
