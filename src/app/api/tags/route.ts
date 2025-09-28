import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const tags = await prisma.tag.findMany({
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
    const body = await request.json();
    const { name, color, icon } = body;

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Tag name is required'
      }, { status: 400 });
    }

    // Check if tag already exists
    const existingTag = await prisma.tag.findUnique({
      where: { name }
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
        icon: icon || 'tag'
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