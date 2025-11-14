import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/users/[id]
 * Get detailed information about a specific user
 * Requires admin role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            user_movies: true,
            watchlist_movies: true,
            vaults: true,
            tags: true,
          },
        },
        user_movies: {
          select: {
            id: true,
            date_watched: true,
            personal_rating: true,
          },
          orderBy: {
            date_watched: 'desc',
          },
          take: 10, // Last 10 movies
        },
        watchlist_movies: {
          select: {
            id: true,
            title: true,
            created_at: true,
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 10, // Last 10 watchlist items
        },
        vaults: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
          },
          orderBy: {
            updated_at: 'desc',
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const formattedUser = {
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
      recent_movies: user.user_movies,
      recent_watchlist: user.watchlist_movies,
      vaults: user.vaults,
    };

    return NextResponse.json({
      success: true,
      data: formattedUser,
    });
  } catch (error) {
    console.error('Admin user fetch error:', error);

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user properties (role, etc.)
 * Requires admin role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { role, name, email } = body;

    // Validate role if provided
    if (role && !['user', 'admin'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be "user" or "admin"' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: { role?: string; name?: string; email?: string } = {};
    if (role !== undefined) updateData.role = role;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        clerk_id: updatedUser.clerk_id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        updated_at: updatedUser.updated_at,
      },
    });
  } catch (error) {
    console.error('Admin user update error:', error);

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
