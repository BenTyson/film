/* eslint-disable @typescript-eslint/no-unused-vars */
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Get only tags created by this user
    const tags = await prisma.tag.findMany({
      where: {
        user_id: user.id
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tags'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { name, color, icon } = body;

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Tag name is required'
      }, { status: 400 });
    }

    // Check if tag already exists for this user
    const existingTag = await prisma.tag.findUnique({
      where: {
        name_user_id: {
          name,
          user_id: user.id
        }
      }
    });

    if (existingTag) {
      return NextResponse.json({
        success: false,
        error: 'Tag already exists'
      }, { status: 409 });
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || '#6366f1',
        icon: icon || 'tag',
        user_id: user.id
      }
    });

    return NextResponse.json({
      success: true,
      data: tag
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create tag'
    }, { status: 500 });
  }
}