import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { year: string } }
) {
  try {
    const year = parseInt(params.year);

    if (isNaN(year)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid year parameter'
      }, { status: 400 });
    }

    // Get all nominations for the year
    const nominations = await prisma.oscarNomination.findMany({
      where: {
        ceremony_year: year
      },
      include: {
        category: true,
        movie: true
      },
      orderBy: [
        { category: { category_group: 'asc' } },
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

    // Transform nominations
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
    console.error(`Error fetching Oscar nominations for year ${params.year}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Oscar nominations for year'
    }, { status: 500 });
  }
}