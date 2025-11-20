import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// GET all vaults for current user
export async function GET() {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    const vaults = await prisma.vaults.findMany({
      where: {
        user_id: user.id,
      },
      include: {
        vault_movies: {
          select: {
            poster_path: true,
          },
          take: 4, // Get first 4 posters for preview
          orderBy: {
            created_at: 'desc',
          },
        },
        _count: {
          select: {
            vault_movies: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    // Transform to include movie_count and preview_posters
    const vaultsWithCounts = vaults.map((vault) => ({
      id: vault.id,
      user_id: vault.user_id,
      name: vault.name,
      description: vault.description,
      created_at: vault.created_at,
      updated_at: vault.updated_at,
      movie_count: vault._count.vault_movies,
      preview_posters: vault.vault_movies
        .map((m) => m.poster_path)
        .filter((p): p is string => p !== null),
    }));

    return NextResponse.json({
      success: true,
      data: vaultsWithCounts,
    });
  } catch (error) {
    console.error('Error fetching vaults:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch vaults',
      },
      { status: 500 }
    );
  }
}

// POST - Create new vault
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Vault name is required',
        },
        { status: 400 }
      );
    }

    // Check if vault with this name already exists for this user
    const existingVault = await prisma.vaults.findFirst({
      where: {
        user_id: user.id,
        name: name.trim(),
      },
    });

    if (existingVault) {
      return NextResponse.json(
        {
          success: false,
          error: 'A vault with this name already exists',
        },
        { status: 400 }
      );
    }

    const vault = await prisma.vaults.create({
      data: {
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        updated_at: new Date()
      },
    });

    return NextResponse.json({
      success: true,
      data: vault,
    });
  } catch (error) {
    console.error('Error creating vault:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create vault',
      },
      { status: 500 }
    );
  }
}
