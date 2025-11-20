import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// GET single vault with movies
export async function GET(
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

    const vault = await prisma.vaults.findFirst({
      where: {
        id: vaultId,
        user_id: user.id, // Ensure user owns this vault
      },
      include: {
        vault_movies: {
          orderBy: {
            created_at: 'desc',
          },
        },
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

    // Check which movies are in the user's collection
    const tmdbIds = vault.vault_movies.map((m) => m.tmdb_id);
    const userMovies = await prisma.user_movies.findMany({
      where: {
        user_id: user.id,
        movies: {
          tmdb_id: {
            in: tmdbIds,
          },
        },
      },
      include: {
        movies: {
          select: {
            id: true,
            tmdb_id: true,
          },
        },
      },
    });

    // Create a map of tmdb_id to movie_id for collection movies
    const collectionMovieMap = new Map(
      userMovies.map((um) => [um.movies.tmdb_id, um.movies.id])
    );

    // Add in_collection flag and collection_movie_id to movies
    const moviesWithCollectionStatus = vault.vault_movies.map((movie) => ({
      ...movie,
      in_collection: collectionMovieMap.has(movie.tmdb_id),
      collection_movie_id: collectionMovieMap.get(movie.tmdb_id) || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...vault,
        movies: moviesWithCollectionStatus,
      },
    });
  } catch (error) {
    console.error('Error fetching vault:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch vault',
      },
      { status: 500 }
    );
  }
}

// PATCH - Update vault name/description
export async function PATCH(
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

    const body = await request.json();
    const { name, description } = body;

    // Verify vault ownership
    const vault = await prisma.vaults.findFirst({
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

    // Build update data
    const updateData: { name?: string; description?: string | null } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: 'Vault name cannot be empty',
          },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    const updatedVault = await prisma.vaults.update({
      where: { id: vaultId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedVault,
    });
  } catch (error) {
    console.error('Error updating vault:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update vault',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete vault
export async function DELETE(
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
    const vault = await prisma.vaults.findFirst({
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

    // Delete vault (cascade will delete all vault movies)
    await prisma.vaults.delete({
      where: { id: vaultId },
    });

    return NextResponse.json({
      success: true,
      message: 'Vault deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting vault:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete vault',
      },
      { status: 500 }
    );
  }
}
