import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// POST - Add movie to vault
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id: paramId } = await params;
    const vaultId = parseInt(paramId);

    if (isNaN(vaultId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid vault ID',
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

    const body = await request.json();
    const {
      tmdb_id,
      title,
      director,
      release_date,
      poster_path,
      backdrop_path,
      overview,
      runtime,
      genres,
      vote_average,
      imdb_id,
    } = body;

    if (!tmdb_id || !title) {
      return NextResponse.json(
        {
          success: false,
          error: 'TMDB ID and title are required',
        },
        { status: 400 }
      );
    }

    // Check if movie already exists in this vault
    const existingMovie = await prisma.vaultMovie.findFirst({
      where: {
        vault_id: vaultId,
        tmdb_id,
      },
    });

    if (existingMovie) {
      return NextResponse.json(
        {
          success: false,
          error: 'Movie already exists in this vault',
        },
        { status: 400 }
      );
    }

    // Add movie to vault
    const vaultMovie = await prisma.vaultMovie.create({
      data: {
        vault_id: vaultId,
        tmdb_id,
        title,
        director,
        release_date: release_date ? new Date(release_date) : null,
        poster_path,
        backdrop_path,
        overview,
        runtime,
        genres,
        vote_average,
        imdb_id,
      },
    });

    return NextResponse.json({
      success: true,
      data: vaultMovie,
    });
  } catch (error) {
    console.error('Error adding movie to vault:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add movie to vault',
      },
      { status: 500 }
    );
  }
}
