import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/errors
 * Get error logs with filtering
 * Requires admin role
 *
 * Query params:
 * - endpoint: Filter by specific endpoint
 * - status_code: Filter by status code
 * - limit: Number of errors to return (default 50)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const statusCode = searchParams.get('status_code');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: { endpoint?: { contains: string }; status_code?: number } = {};
    if (endpoint) where.endpoint = { contains: endpoint };
    if (statusCode) where.status_code = parseInt(statusCode);

    // Fetch errors
    const [errors, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        include: {
          user: {
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
      prisma.errorLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        errors,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    console.error('Admin errors fetch error:', error);

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch error logs' },
      { status: 500 }
    );
  }
}
