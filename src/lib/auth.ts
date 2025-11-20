import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from './prisma';

/**
 * Get the current authenticated user from the database
 * Throws an error if the user is not authenticated
 * Automatically creates the user in the database if they don't exist
 */
export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Find user in our database by Clerk ID
  let user = await prisma.users.findUnique({
    where: { clerk_id: userId },
  });

  // If user doesn't exist in database, create them
  if (!user) {
    // Get user details from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    // Create user in database
    user = await prisma.users.create({
      data: {
        clerk_id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        name: clerkUser.firstName && clerkUser.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress || 'User',
        role: 'user', // Default role for new users
        last_login_at: new Date(),
        updated_at: new Date()
      },
    });
  } else {
    // Update last login time for existing users
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });
    user.last_login_at = new Date();
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
