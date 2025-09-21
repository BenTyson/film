import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get all approved movies with their release dates
    const movies = await prisma.movie.findMany({
      where: {
        approval_status: 'approved',
        release_date: {
          not: null
        }
      },
      select: {
        release_date: true
      }
    });

    // Count movies by year
    const yearCounts: Record<string, number> = {};

    movies.forEach(movie => {
      if (movie.release_date) {
        const year = new Date(movie.release_date).getFullYear().toString();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });

    // Convert to array and sort by year (descending)
    const yearData = Object.entries(yearCounts)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => parseInt(b.year) - parseInt(a.year));

    return NextResponse.json({
      success: true,
      data: yearData
    });

  } catch (error) {
    console.error('Error fetching movie year counts:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch movie year counts'
    }, { status: 500 });
  }
}