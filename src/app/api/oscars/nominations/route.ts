/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const category = searchParams.get('category');
    const winner_only = searchParams.get('winner_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause for unified oscar_nominations table
    const where: any = {};
    if (year) {
      where.ceremony_year = parseInt(year);
    }
    if (category) {
      where.category = {
        name: category
      };
    }
    if (winner_only) {
      where.is_winner = true;
    }

    // Get nominations with related data from unified table
    const nominations = await prisma.oscar_nominations.findMany({
      where,
      include: {
        oscar_movies: true,
        oscar_categories: true
      },
      orderBy: [
        { ceremony_year: 'desc' },
        { oscar_categories: { name: 'asc' } },
        { is_winner: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    // Get total count for pagination
    const totalCount = await prisma.oscar_nominations.count({ where });

    // Get user's movie collection for TMDB ID matching
    const userMovies = await prisma.movies.findMany({
      where: { approval_status: 'approved' },
      select: { tmdb_id: true, id: true, title: true, poster_path: true }
    });

    // Create lookup map for fast TMDB ID matching
    const userMovieMap = new Map(userMovies.map(m => [m.tmdb_id, m]));

    // Transform the data for better client consumption with collection status and fetch TMDB posters if needed
    const transformedNominations = await Promise.all(nominations.map(async nomination => {
      const collectionMovie = nomination.oscar_movies?.tmdb_id
        ? userMovieMap.get(nomination.oscar_movies.tmdb_id)
        : null;

      let posterPath = collectionMovie?.poster_path || null;

      // If not in collection and no poster, try to fetch from internal TMDB API
      if (!collectionMovie && nomination.oscar_movies?.tmdb_id && !posterPath) {
        try {
          const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://yourdomain.com'
            : 'http://localhost:3002';
          const tmdbResponse = await fetch(`${baseUrl}/api/tmdb/movie/${nomination.oscar_movies.tmdb_id}`);
          if (tmdbResponse.ok) {
            const tmdbData = await tmdbResponse.json();
            if (tmdbData.success && tmdbData.data?.poster_path) {
              posterPath = tmdbData.data.poster_path;
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch TMDB poster for ${nomination.oscar_movies.title}:`, error);
        }
      }

      return {
        id: nomination.id,
        ceremony_year: nomination.ceremony_year,
        category: nomination.oscar_categories?.name || '',
        category_group: nomination.oscar_categories?.category_group || '',
        nominee_name: nomination.nominee_name,
        is_winner: nomination.is_winner,
        movie: nomination.oscar_movies ? {
          id: nomination.oscar_movies.id,
          title: nomination.oscar_movies.title,
          tmdb_id: nomination.oscar_movies.tmdb_id,
          imdb_id: nomination.oscar_movies.imdb_id,
          // Add collection status and poster (from collection or TMDB)
          in_collection: !!collectionMovie,
          collection_id: collectionMovie?.id || null,
          poster_path: posterPath
        } : null
      };
    }));

    // Group by year if requested
    const groupByYear = searchParams.get('group_by_year') === 'true';
    let groupedData = null;

    if (groupByYear) {
      groupedData = transformedNominations.reduce((acc, nomination) => {
        const year = nomination.ceremony_year;
        if (!acc[year]) {
          acc[year] = [];
        }
        acc[year].push(nomination);
        return acc;
      }, {} as Record<number, typeof transformedNominations>);
    }

    return NextResponse.json({
      success: true,
      data: {
        oscar_nominations: transformedNominations,
        grouped_by_year: groupedData,
        pagination: {
          total_count: totalCount,
          limit,
          offset,
          has_more: offset + limit < totalCount
        }
      }
    });

  } catch (error) {
    console.error('Error fetching Oscar oscar_nominations:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Oscar nominations'
    }, { status: 500 });
  }
}