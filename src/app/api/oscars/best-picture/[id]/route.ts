import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    const body = await request.json();
    const { tmdb_id, movie_title } = body;

    const updated = await prisma.bestPictureNominee.update({
      where: { id },
      data: {
        ...(tmdb_id !== undefined && { tmdb_id }),
        ...(movie_title && { movie_title })
      }
    });

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating Best Picture nominee:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update nominee'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);

    const nominee = await prisma.bestPictureNominee.findUnique({
      where: { id }
    });

    if (!nominee) {
      return NextResponse.json({
        success: false,
        error: 'Nominee not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: nominee
    });
  } catch (error) {
    console.error('Error fetching nominee:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch nominee'
    }, { status: 500 });
  }
}