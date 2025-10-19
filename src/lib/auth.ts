import { auth } from '@clerk/nextjs/server';
import { prisma } from './prisma';

/**
 * Get the current authenticated user from the database
 * Throws an error if the user is not authenticated
 */
export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Find user in our database by Clerk ID
  const user = await prisma.user.findUnique({
    where: { clerk_id: userId },
  });

  if (!user) {
    throw new Error('User not found in database');
  }

  return user;
}

/**
 * Check if the current user has admin privileges
 */
export async function requireAdmin() {
  const user = await getCurrentUser();

  if (user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }

  return user;
}

/**
 * Get user ID safely (returns null if not authenticated)
 */
export async function getUserIdOrNull() {
  try {
    const user = await getCurrentUser();
    return user.id;
  } catch {
    return null;
  }
}
