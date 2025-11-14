import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/stats
 * Get system-wide statistics
 * Requires admin role
 */
export async function GET() {
  try {
    // Verify admin access
    await requireAdmin();

    // Get counts for all major entities
    const [
      totalUsers,
      totalMovies,
      totalWatchlistItems,
      totalVaults,
      totalTags,
      totalOscarMovies,
      totalOscarNominations,
      recentUsers,
      activeUsers,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Total user movies (across all users)
      prisma.userMovie.count(),

      // Total watchlist items (across all users)
      prisma.watchlistMovie.count(),

      // Total vaults
      prisma.vault.count(),

      // Total tags
      prisma.tag.count(),

      // Total Oscar movies
      prisma.oscarMovie.count(),

      // Total Oscar nominations
      prisma.oscarNomination.count(),

      // Users created in last 30 days
      prisma.user.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Users active in last 7 days (logged in)
      prisma.user.count({
        where: {
          last_login_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get average collection size per user
    const avgStats = await prisma.userMovie.groupBy({
      by: ['user_id'],
      _count: {
        user_id: true,
      },
    });

    const avgCollectionSize = avgStats.length > 0
      ? Math.round(avgStats.reduce((sum, stat) => sum + stat._count.user_id, 0) / avgStats.length)
      : 0;

    // Get most active users (top 5 by collection size)
    const topUsers = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            user_movies: true,
          },
        },
      },
      orderBy: {
        user_movies: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          new_this_month: recentUsers,
          active_this_week: activeUsers,
        },
        content: {
          total_movies: totalMovies,
          total_watchlist_items: totalWatchlistItems,
          total_vaults: totalVaults,
          total_tags: totalTags,
          avg_collection_size: avgCollectionSize,
        },
        oscars: {
          total_movies: totalOscarMovies,
          total_nominations: totalOscarNominations,
        },
        top_users: topUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          collection_size: user._count.user_movies,
        })),
      },
    });
  } catch (error) {
    console.error('Admin stats fetch error:', error);

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
