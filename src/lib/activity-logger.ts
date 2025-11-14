import { prisma } from './prisma';

export type ActivityType =
  | 'movie_added'
  | 'movie_updated'
  | 'movie_removed'
  | 'csv_import'
  | 'watchlist_added'
  | 'watchlist_removed'
  | 'vault_created'
  | 'vault_updated'
  | 'vault_deleted'
  | 'vault_movie_added'
  | 'vault_movie_removed'
  | 'tag_created'
  | 'movie_tagged'
  | 'user_login';

export type TargetType = 'movie' | 'import' | 'watchlist' | 'vault' | 'tag' | 'user';

interface ActivityLogParams {
  userId: number;
  actionType: ActivityType;
  targetType?: TargetType;
  targetId?: number;
  metadata?: Record<string, string | number | boolean | null>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a user activity to the database
 * This function is designed to never throw errors to avoid breaking the main operation
 */
export async function logActivity({
  userId,
  actionType,
  targetType,
  targetId,
  metadata,
  ipAddress,
  userAgent,
}: ActivityLogParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });
  } catch (error) {
    // Log to console but don't throw - activity logging should never break the main operation
    console.error('Failed to log activity:', error);
  }
}

/**
 * Helper function to extract IP and User Agent from NextRequest
 */
export function getRequestMetadata(request: Request) {
  const headers = request.headers;

  // Try to get real IP from various headers (for proxies/load balancers)
  const ipAddress =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    'unknown';

  const userAgent = headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}
