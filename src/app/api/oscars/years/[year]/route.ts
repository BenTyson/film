import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string }> }
) {
  try {
    const { year: paramYear } = await params;
    const year = parseInt(paramYear);

    if (isNaN(year)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid year parameter'
      }, { status: 400 });
    }

    // Get all nominations for the year from unified table
    const nominations = await prisma.oscarNomination.findMany({
      where: {
        ceremony_year: year
      },
      include: {
        movie: true,
        category: true
      },
      orderBy: [
        { category: { name: 'asc' } },
        { is_winner: 'desc' }
      ]
    });

    if (nominations.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No nominations found for year ${year}`
      }, { status: 404 });
    }

    // Get user's movie collection for TMDB ID matching
    const userMovies = await prisma.movie.findMany({
      where: { approval_status: 'approved' },
      select: { tmdb_id: true, id: true, title: true, poster_path: true }
    });

    // Create lookup map for fast TMDB ID matching
    const userMovieMap = new Map(userMovies.map(m => [m.tmdb_id, m]));

    // Transform nominations with collection status and fetch TMDB posters if needed
    const transformedNominations = await Promise.all(nominations.map(async nomination => {
      const collectionMovie = nomination.movie?.tmdb_id
        ? userMovieMap.get(nomination.movie.tmdb_id)
        : null;

      let posterPath = collectionMovie?.poster_path || null;

      // If not in collection and no poster, try to fetch from internal TMDB API
      if (!collectionMovie && nomination.movie?.tmdb_id && !posterPath) {
        try {
          const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://yourdomain.com'
            : 'http://localhost:3002';
          const tmdbResponse = await fetch(`${baseUrl}/api/tmdb/movie/${nomination.movie.tmdb_id}`);
          if (tmdbResponse.ok) {
            const tmdbData = await tmdbResponse.json();
            if (tmdbData.success && tmdbData.data?.poster_path) {
              posterPath = tmdbData.data.poster_path;
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch TMDB poster for ${nomination.movie.title}:`, error);
        }
      }

      return {
        id: nomination.id,
        ceremony_year: nomination.ceremony_year,
        category: nomination.category?.name || '',
        category_group: nomination.category?.category_group || '',
        nominee_name: nomination.nominee_name,
        is_winner: nomination.is_winner,
        movie: nomination.movie ? {
          id: nomination.movie.id,
          title: nomination.movie.title,
          tmdb_id: nomination.movie.tmdb_id,
          imdb_id: nomination.movie.imdb_id,
          // Add collection status and poster (from collection or TMDB)
          in_collection: !!collectionMovie,
          collection_id: collectionMovie?.id || null,
          poster_path: posterPath
        } : null
      };
    }));

    // Group by category
    const groupedByCategory = transformedNominations.reduce((acc, nomination) => {
      const category = nomination.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(nomination);
      return acc;
    }, {} as Record<string, typeof transformedNominations>);

    // Group by category group
    const groupedByCategoryGroup = transformedNominations.reduce((acc, nomination) => {
      const group = nomination.category_group || 'Other';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(nomination);
      return acc;
    }, {} as Record<string, typeof transformedNominations>);

    // Calculate statistics
    const stats = {
      ceremony_year: year,
      total_nominations: nominations.length,
      total_winners: nominations.filter(n => n.is_winner).length,
      categories_count: Object.keys(groupedByCategory).length,
      category_groups_count: Object.keys(groupedByCategoryGroup).length,
      movies_nominated: new Set(nominations.filter(n => n.movie).map(n => n.movie!.id)).size
    };

    return NextResponse.json({
      success: true,
      data: {
        nominations: transformedNominations,
        grouped_by_category: groupedByCategory,
        grouped_by_category_group: groupedByCategoryGroup,
        stats
      }
    });

  } catch (error) {
    const { year: paramYear } = await params;
    console.error(`Error fetching Oscar nominations for year ${paramYear}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Oscar nominations for year'
    }, { status: 500 });
  }
}