import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/activity
 * Get activity feed with filtering
 * Requires admin role
 *
 * Query params:
 * - user_id: Filter by specific user
 * - action_type: Filter by action type
 * - limit: Number of activities to return (default 50)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const actionType = searchParams.get('action_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: { user_id?: number; action_type?: string } = {};
    if (userId) where.user_id = parseInt(userId);
    if (actionType) where.action_type = actionType;

    // Fetch activities
    const [activities, total] = await Promise.all([
      prisma.activity_logs.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.activity_logs.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        activities,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    console.error('Admin activity fetch error:', error);

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
