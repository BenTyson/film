import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dryRun = true } = body;

    // Find all movies that don't have an approval status set or are still at default
    const moviesToMigrate = await prisma.movie.findMany({
      where: {
        OR: [
          { approval_status: null },
          { approval_status: '' },
          // Include movies that might still be set to a default value
          { approval_status: 'pending', approved_at: null, approved_by: null }
        ]
      },
      select: {
        id: true,
        title: true,
        approval_status: true,
        csv_row_number: true,
        created_at: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    const stats = {
      totalMoviesFound: moviesToMigrate.length,
      withCsvData: moviesToMigrate.filter(m => m.csv_row_number !== null).length,
      withoutCsvData: moviesToMigrate.filter(m => m.csv_row_number === null).length,
      migrated: 0
    };

    if (!dryRun && moviesToMigrate.length > 0) {
      // Update all movies to pending approval status
      const result = await prisma.movie.updateMany({
        where: {
          id: { in: moviesToMigrate.map(m => m.id) }
        },
        data: {
          approval_status: 'pending',
          updated_at: new Date()
        }
      });

      stats.migrated = result.count;
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        movies: dryRun ? moviesToMigrate.slice(0, 10) : [], // Show first 10 for preview
        message: dryRun
          ? `Found ${stats.totalMoviesFound} movies that need approval status migration`
          : `Successfully migrated ${stats.migrated} movies to pending approval status`
      },
      dryRun
    });

  } catch (error) {
    console.error('Error in approval migration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to migrate approval status' },
      { status: 500 }
    );
  }
}

// Get migration status
export async function GET(request: NextRequest) {
  try {
    const [
      totalMovies,
      pendingMovies,
      approvedMovies
    ] = await Promise.all([
      prisma.movie.count(),
      prisma.movie.count({ where: { approval_status: 'pending' } }),
      prisma.movie.count({ where: { approval_status: 'approved' } })
    ]);

    const noStatusMovies = totalMovies - pendingMovies - approvedMovies;

    return NextResponse.json({
      success: true,
      data: {
        total: totalMovies,
        pending: pendingMovies,
        approved: approvedMovies,
        needsMigration: noStatusMovies,
        migrationComplete: noStatusMovies === 0
      }
    });

  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}