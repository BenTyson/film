import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const category = searchParams.get('category');
    const type = searchParams.get('type'); // 'won' or 'nominated'

    // If specific year requested
    if (year) {
      const oscars = await prisma.oscar_data.findMany({
        where: {
          ceremony_year: parseInt(year),
          ...(category && { category }),
          ...(type && { is_winner: type === 'won' }),
        },
        include: {
          movies: {
            include: {
              user_movies: true,
              movie_tags: {
                include: {
                  tags: true
                }
              }
            }
          }
        },
        orderBy: [
          { category: 'asc' },
          { is_winner: 'desc' }, // Winners first
        ]
      });

      return NextResponse.json({
        success: true,
        data: oscars
      });
    }

    // Get Oscar statistics
    const stats = await Promise.all([
      // Total Oscar movies in collection
      prisma.movies.count({
        where: {
          oscar_data: {
            some: {}
          }
        }
      }),

      // Total wins vs nominations
      prisma.oscar_data.groupBy({
        by: ['is_winner'],
        _count: {
          id: true
        }
      }),

      // Awards by year
      prisma.oscar_data.groupBy({
        by: ['ceremony_year'],
        _count: {
          id: true
        },
        orderBy: {
          ceremony_year: 'desc'
        }
      }),

      // Awards by category
      prisma.oscar_data.groupBy({
        by: ['category'],
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      }),

      // Most awarded movies
      prisma.movies.findMany({
        where: {
          oscar_data: {
            some: {
              is_winner: true
            }
          }
        },
        include: {
          oscar_data: {
            where: {
              is_winner: true
            }
          },
          user_movies: true
        },
        orderBy: {
          oscar_data: {
            _count: 'desc'
          }
        },
        take: 10
      })
    ]);

    const [
      totalOscarMovies,
      typeStats,
      yearStats,
      categoryStats,
      mostAwardedMovies
    ] = stats;

    const winsCount = typeStats.find(s => s.is_winner === true)?._count.id || 0;
    const nominationsCount = typeStats.find(s => s.is_winner === false)?._count.id || 0;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_oscar_movies: totalOscarMovies,
          total_wins: winsCount,
          total_oscar_nominations: nominationsCount,
          total_awards: winsCount + nominationsCount
        },
        by_year: yearStats.map(stat => ({
          year: stat.ceremony_year,
          count: stat._count.id
        })),
        by_category: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count.id
        })),
        most_awarded_movies: mostAwardedMovies.map(movie => ({
          id: movie.id,
          title: movie.title,
          release_date: movie.release_date,
          poster_path: movie.poster_path,
          oscar_wins: movie.oscar_data.length,
          personal_rating: movie.user_movies[0]?.personal_rating || null
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching Oscar data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Oscar data'
    }, { status: 500 });
  }
}