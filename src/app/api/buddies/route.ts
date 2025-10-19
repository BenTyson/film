import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'ideaswithben@gmail.com';

const ADMIN_BUDDY_PRESETS = [
  { name: 'Calen', icon: '👥', color: 'text-blue-400' },
  { name: 'Morgan', icon: '💑', color: 'text-pink-400' },
  { name: 'Liam', icon: '👨‍👦', color: 'text-green-400' },
  { name: 'Elodi', icon: '👨‍👩‍👧', color: 'text-purple-400' },
  { name: 'Solo', icon: '🎬', color: 'text-gray-400' },
];

/* eslint-disable @typescript-eslint/no-unused-vars */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // If admin, return the hardcoded buddy presets
    if (user.email === ADMIN_EMAIL) {
      return NextResponse.json({
        success: true,
        data: ADMIN_BUDDY_PRESETS
      });
    }

    // For other users, get unique buddy names from their watch history
    const userMovies = await prisma.userMovie.findMany({
      where: {
        user_id: user.id
      },
      select: {
        buddy_watched_with: true
      }
    });

    // Extract unique buddy names from JSON arrays
    const uniqueBuddies = new Set<string>();
    userMovies.forEach(um => {
      if (Array.isArray(um.buddy_watched_with)) {
        um.buddy_watched_with.forEach((buddy: unknown) => {
          if (typeof buddy === 'string') {
            uniqueBuddies.add(buddy);
          }
        });
      }
    });

    // Transform to buddy preset format
    const buddyPresets = Array.from(uniqueBuddies).map(name => ({
      name,
      icon: '👥', // Default icon for custom buddies
      color: 'text-blue-400' // Default color
    }));

    return NextResponse.json({
      success: true,
      data: buddyPresets
    });
  } catch (error) {
    console.error('Error fetching buddies:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch buddies'
    }, { status: 500 });
  }
}
