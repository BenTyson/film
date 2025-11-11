import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [total, autoVerified, needsReview, manuallyReviewed, pending] = await Promise.all([
      prisma.oscarMovie.count(),
      prisma.oscarMovie.count({
        where: { review_status: 'auto_verified' }
      }),
      prisma.oscarMovie.count({
        where: { review_status: 'needs_manual_review' }
      }),
      prisma.oscarMovie.count({
        where: { review_status: 'manually_reviewed' }
      }),
      prisma.oscarMovie.count({
        where: { review_status: 'pending' }
      })
    ]);

    const verified = autoVerified + manuallyReviewed;
    const needsAction = needsReview + pending;

    return NextResponse.json({
      success: true,
      data: {
        total,
        auto_verified: autoVerified,
        needs_manual_review: needsReview,
        manually_reviewed: manuallyReviewed,
        pending,
        verified,
        needs_action: needsAction,
        completion_percentage: total > 0 ? Math.round((verified / total) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Error fetching review stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch review stats'
    }, { status: 500 });
  }
}
