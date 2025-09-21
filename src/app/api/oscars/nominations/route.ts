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

    // Build where clause
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

    // Get nominations with related data
    const nominations = await prisma.oscarNomination.findMany({
      where,
      include: {
        category: true,
        movie: true
      },
      orderBy: [
        { ceremony_year: 'desc' },
        { category: { name: 'asc' } },
        { is_winner: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    // Get total count for pagination
    const totalCount = await prisma.oscarNomination.count({ where });

    // Transform the data for better client consumption
    const transformedNominations = nominations.map(nomination => ({
      id: nomination.id,
      ceremony_year: nomination.ceremony_year,
      category: nomination.category.name,
      category_group: nomination.category.category_group,
      nominee_name: nomination.nominee_name,
      is_winner: nomination.is_winner,
      movie: nomination.movie ? {
        id: nomination.movie.id,
        title: nomination.movie.title,
        tmdb_id: nomination.movie.tmdb_id,
        imdb_id: nomination.movie.imdb_id
      } : null
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
        nominations: transformedNominations,
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
    console.error('Error fetching Oscar nominations:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Oscar nominations'
    }, { status: 500 });
  }
}