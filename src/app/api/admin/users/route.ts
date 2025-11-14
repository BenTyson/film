import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/users
 * Get all users with aggregated statistics
 * Requires admin role
 */
export async function GET() {
  try {
    // Verify admin access
    await requireAdmin();

    // Fetch all users with aggregated counts
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            user_movies: true,
            watchlist_movies: true,
            vaults: true,
            tags: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Format the response
    const formattedUsers = users.map(user => ({
      id: user.id,
      clerk_id: user.clerk_id,
      email: user.email,
      name: user.name,
      role: user.role,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
      stats: {
        movies: user._count.user_movies,
        watchlist: user._count.watchlist_movies,
        vaults: user._count.vaults,
        tags: user._count.tags,
      },
    }));

    return NextResponse.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error) {
    console.error('Admin users fetch error:', error);

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
