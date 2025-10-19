import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// DELETE - Remove movie from vault
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; movieId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id: paramId, movieId: movieParamId } = await params;
    const vaultId = parseInt(paramId);
    const movieId = parseInt(movieParamId);

    if (isNaN(vaultId) || isNaN(movieId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid vault ID or movie ID',
        },
        { status: 400 }
      );
    }

    // Verify vault ownership
    const vault = await prisma.vault.findFirst({
      where: {
        id: vaultId,
        user_id: user.id,
      },
    });

    if (!vault) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vault not found',
        },
        { status: 404 }
      );
    }

    // Check if movie exists in vault
    const vaultMovie = await prisma.vaultMovie.findFirst({
      where: {
        id: movieId,
        vault_id: vaultId,
      },
    });

    if (!vaultMovie) {
      return NextResponse.json(
        {
          success: false,
          error: 'Movie not found in this vault',
        },
        { status: 404 }
      );
    }

    // Delete the movie from vault
    await prisma.vaultMovie.delete({
      where: { id: movieId },
    });

    return NextResponse.json({
      success: true,
      message: 'Movie removed from vault',
    });
  } catch (error) {
    console.error('Error removing movie from vault:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove movie from vault',
      },
      { status: 500 }
    );
  }
}
