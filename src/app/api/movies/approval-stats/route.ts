/* eslint-disable @typescript-eslint/no-unused-vars */
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get approval statistics
    const [
      totalMovies,
      pendingMovies,
      approvedMovies,
      moviesWithCsv,
      recentApprovals
    ] = await Promise.all([
      prisma.movies.count(),
      prisma.movies.count({ where: { approval_status: 'pending' } }),
      prisma.movies.count({ where: { approval_status: 'approved' } }),
      prisma.movies.count({ where: { csv_row_number: { not: null } } }),
      prisma.movies.findMany({
        where: { approval_status: 'approved' },
        orderBy: { approved_at: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          approved_at: true,
          approved_by: true
        }
      })
    ]);

    const stats = {
      total: totalMovies,
      pending: pendingMovies,
      approved: approvedMovies,
      withCsv: moviesWithCsv,
      approvalRate: totalMovies > 0 ? Math.round((approvedMovies / totalMovies) * 100) : 0,
      recentApprovals
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching approval stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch approval statistics' },
      { status: 500 }
    );
  }
}

// Batch approve multiple movies
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { movieIds, approved_by = 'Ben' } = body;

    if (!movieIds || !Array.isArray(movieIds) || movieIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Movie IDs array is required' },
        { status: 400 }
      );
    }

    // Validate all movie IDs are numbers
    const validIds = movieIds.filter(id => typeof id === 'number' && !isNaN(id));
    if (validIds.length !== movieIds.length) {
      return NextResponse.json(
        { success: false, error: 'All movie IDs must be valid numbers' },
        { status: 400 }
      );
    }

    // Check which movies exist and are pending
    const movies = await prisma.movies.findMany({
      where: {
        id: { in: validIds },
        approval_status: 'pending'
      },
      select: { id: true, title: true }
    });

    if (movies.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No pending movies found for the provided IDs' },
        { status: 400 }
      );
    }

    // Batch approve movies
    const result = await prisma.movies.updateMany({
      where: {
        id: { in: movies.map(m => m.id) }
      },
      data: {
        approval_status: 'approved',
        approved_at: new Date(),
        approved_by: approved_by,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        approvedCount: result.count,
        approvedMovies: movies,
        message: `Successfully approved ${result.count} movie(s)`
      }
    });

  } catch (error) {
    console.error('Error in batch approval:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to batch approve movies' },
      { status: 500 }
    );
  }
}