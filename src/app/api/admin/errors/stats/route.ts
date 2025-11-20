import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/errors/stats
 * Get error statistics and trends
 * Requires admin role
 */
export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel queries for performance
    const [
      total24h,
      total7d,
      total30d,
      totalAll,
      topEndpoints,
      recentErrors,
      errorsByStatusCode,
    ] = await Promise.all([
      // Errors in last 24 hours
      prisma.error_logs.count({
        where: { created_at: { gte: last24h } },
      }),

      // Errors in last 7 days
      prisma.error_logs.count({
        where: { created_at: { gte: last7d } },
      }),

      // Errors in last 30 days
      prisma.error_logs.count({
        where: { created_at: { gte: last30d } },
      }),

      // Total errors
      prisma.error_logs.count(),

      // Top 5 endpoints with most errors
      prisma.error_logs.groupBy({
        by: ['endpoint'],
        _count: {
          endpoint: true,
        },
        orderBy: {
          _count: {
            endpoint: 'desc',
          },
        },
        take: 5,
      }),

      // Most recent errors (last 5)
      prisma.error_logs.findMany({
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
        take: 5,
      }),

      // Errors grouped by status code
      prisma.error_logs.groupBy({
        by: ['status_code'],
        _count: {
          status_code: true,
        },
        orderBy: {
          _count: {
            status_code: 'desc',
          },
        },
      }),
    ]);

    // Calculate error rate trend (comparing last 24h to previous 24h)
    const previous24hStart = new Date(last24h.getTime() - 24 * 60 * 60 * 1000);
    const previous24hCount = await prisma.error_logs.count({
      where: {
        created_at: {
          gte: previous24hStart,
          lt: last24h,
        },
      },
    });

    const errorRateTrend =
      previous24hCount > 0
        ? ((total24h - previous24hCount) / previous24hCount) * 100
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          last_24h: total24h,
          last_7d: total7d,
          last_30d: total30d,
          total: totalAll,
        },
        trend: {
          error_rate_change_24h: errorRateTrend,
          direction: errorRateTrend > 0 ? 'increasing' : errorRateTrend < 0 ? 'decreasing' : 'stable',
        },
        top_endpoints: topEndpoints.map(e => ({
          endpoint: e.endpoint,
          count: e._count.endpoint,
        })),
        recent_errors: recentErrors,
        by_status_code: errorsByStatusCode.map(e => ({
          status_code: e.status_code,
          count: e._count.status_code,
        })),
      },
    });
  } catch (error) {
    console.error('Admin error stats fetch error:', error);

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch error statistics' },
      { status: 500 }
    );
  }
}
