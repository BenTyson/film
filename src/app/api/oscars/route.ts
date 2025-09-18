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
      const oscars = await prisma.oscarData.findMany({
        where: {
          ceremony_year: parseInt(year),
          ...(category && { category }),
          ...(type && { nomination_type: type }),
        },
        include: {
          movie: {
            include: {
              user_movies: true,
              movie_tags: {
                include: {
                  tag: true
                }
              }
            }
          }
        },
        orderBy: [
          { category: 'asc' },
          { nomination_type: 'desc' }, // Winners first
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
      prisma.movie.count({
        where: {
          oscar_data: {
            some: {}
          }
        }
      }),

      // Total wins vs nominations
      prisma.oscarData.groupBy({
        by: ['nomination_type'],
        _count: {
          id: true
        }
      }),

      // Awards by year
      prisma.oscarData.groupBy({
        by: ['ceremony_year'],
        _count: {
          id: true
        },
        orderBy: {
          ceremony_year: 'desc'
        }
      }),

      // Awards by category
      prisma.oscarData.groupBy({
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
      prisma.movie.findMany({
        where: {
          oscar_data: {
            some: {
              nomination_type: 'won'
            }
          }
        },
        include: {
          oscar_data: {
            where: {
              nomination_type: 'won'
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

    const winsCount = typeStats.find(s => s.nomination_type === 'won')?._count.id || 0;
    const nominationsCount = typeStats.find(s => s.nomination_type === 'nominated')?._count.id || 0;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_oscar_movies: totalOscarMovies,
          total_wins: winsCount,
          total_nominations: nominationsCount,
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