import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { ReviewStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.getAll('status');

    // Default to showing movies that need review
    const defaultStatuses: ReviewStatus[] = ['needs_manual_review', 'pending'];
    const statuses: ReviewStatus[] = statusParam.length > 0
      ? statusParam as ReviewStatus[]
      : defaultStatuses;

    const movies = await prisma.oscarMovie.findMany({
      where: {
        review_status: {
          in: statuses
        }
      },
      include: {
        nominations: {
          include: {
            category: true
          },
          orderBy: {
            ceremony_year: 'desc'
          }
        }
      },
      orderBy: [
        { review_status: 'asc' }, // needs_manual_review before pending
        { id: 'asc' }
      ]
    });

    // Enrich with ceremony year info from nominations
    const enrichedMovies = movies.map(movie => {
      const ceremonyYears = [...new Set(movie.nominations.map(n => n.ceremony_year))];
      const categories = [...new Set(movie.nominations.map(n => n.category.name))];

      return {
        ...movie,
        ceremony_years: ceremonyYears.sort((a, b) => b - a),
        categories
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedMovies,
      count: enrichedMovies.length
    });

  } catch (error) {
    console.error('Error fetching review queue:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch review queue'
    }, { status: 500 });
  }
}
