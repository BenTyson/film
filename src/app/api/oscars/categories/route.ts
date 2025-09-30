/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group');
    const active_only = searchParams.get('active_only') === 'true';

    // Build where clause
    const where: any = {};
    if (group) {
      where.category_group = group;
    }
    if (active_only) {
      where.is_active = true;
    }

    // Get categories with nomination counts
    const categories = await prisma.oscarCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            nominations: true
          }
        }
      },
      orderBy: [
        { category_group: 'asc' },
        { name: 'asc' }
      ]
    });

    // Transform data
    const transformedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      category_group: category.category_group,
      is_active: category.is_active,
      nomination_count: category._count.nominations
    }));

    // Group by category group
    const groupedCategories = transformedCategories.reduce((acc, category) => {
      const group = category.category_group || 'Other';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(category);
      return acc;
    }, {} as Record<string, typeof transformedCategories>);

    // Get statistics
    const stats = {
      total_categories: categories.length,
      active_categories: categories.filter(c => c.is_active).length,
      category_groups: Object.keys(groupedCategories).length,
      total_nominations: categories.reduce((sum, c) => sum + c._count.nominations, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        categories: transformedCategories,
        grouped_categories: groupedCategories,
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching Oscar categories:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Oscar categories'
    }, { status: 500 });
  }
}