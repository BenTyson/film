import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get overall statistics
    const [
      totalNominations,
      totalCategories,
      totalOscarMovies,
      moviesInCollection,
      oscarDataEntries
    ] = await Promise.all([
      prisma.oscar_nominations.count(),
      prisma.oscar_categories.count(),
      prisma.oscar_movies.count(),
      prisma.movies.count({
        where: {
          oscar_data: {
            some: {}
          }
        }
      }),
      prisma.oscar_data.count()
    ]);

    // Get nominations by category
    const nominationsByCategory = await prisma.oscar_nominations.groupBy({
      by: ['category_id'],
      _count: true
    });

    // Get category details
    const categories = await prisma.oscar_categories.findMany({
      orderBy: { name: 'asc' }
    });

    const categoryStats = categories.map(cat => {
      const count = nominationsByCategory.find(n => n.category_id === cat.id)?._count || 0;
      return {
        id: cat.id,
        name: cat.name,
        category_group: cat.category_group,
        nomination_count: count
      };
    });

    // Get year range
    const yearRange = await prisma.oscar_nominations.aggregate({
      _min: { ceremony_year: true },
      _max: { ceremony_year: true }
    });

    // Get recent winners in collection
    const recentWinners = await prisma.oscar_data.findMany({
      where: {
        is_winner: true
      },
      include: {
        movies: {
          select: {
            id: true,
            title: true,
            poster_path: true,
            tmdb_id: true
          }
        }
      },
      orderBy: {
        ceremony_year: 'desc'
      },
      take: 10,
      distinct: ['movie_id']
    });

    // Get movies with most Oscar wins in collection
    const topWinners = await prisma.movies.findMany({
      where: {
        oscar_data: {
          some: {
            is_winner: true
          }
        }
      },
      include: {
        oscar_data: {
          where: { is_winner: true }
        }
      },
      take: 10
    });

    const sortedTopWinners = topWinners
      .map(movie => ({
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        tmdb_id: movie.tmdb_id,
        win_count: movie.oscar_data.length
      }))
      .sort((a, b) => b.win_count - a.win_count);

    // Get nominations by decade
    const currentYear = new Date().getFullYear();
    const decades = [];
    for (let year = 2020; year >= 1920; year -= 10) {
      const startYear = year;
      const endYear = Math.min(year + 9, currentYear);

      const count = await prisma.oscar_nominations.count({
        where: {
          ceremony_year: {
            gte: startYear,
            lte: endYear
          }
        }
      });

      if (count > 0) {
        decades.push({
          decade: `${startYear}s`,
          start_year: startYear,
          end_year: endYear,
          nomination_count: count
        });
      }
    }

    // Collection coverage - how many Oscar movies do we have?
    const oscarMoviesWithTmdb = await prisma.oscar_movies.count({
      where: {
        tmdb_id: { not: null }
      }
    });

    const collectionCoverage = await prisma.movies.count({
      where: {
        tmdb_id: {
          in: await prisma.oscar_movies.findMany({
            where: { tmdb_id: { not: null } },
            select: { tmdb_id: true }
          }).then(movies => movies.map(m => m.tmdb_id!))
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_oscar_nominations: totalNominations,
          total_categories: totalCategories,
          total_oscar_movies: totalOscarMovies,
          movies_in_collection_with_oscars: moviesInCollection,
          oscar_data_entries: oscarDataEntries,
          year_range: {
            start: yearRange._min.ceremony_year,
            end: yearRange._max.ceremony_year
          },
          collection_coverage: {
            oscar_movies_available: oscarMoviesWithTmdb,
            in_collection: collectionCoverage,
            percentage: ((collectionCoverage / oscarMoviesWithTmdb) * 100).toFixed(1)
          }
        },
        categories: categoryStats,
        decades: decades,
        recent_winners: recentWinners.map(w => ({
          movie_id: w.movies.id,
          title: w.movies.title,
          poster_path: w.movies.poster_path,
          tmdb_id: w.movies.tmdb_id,
          year: w.ceremony_year,
          category: w.category
        })),
        top_winners: sortedTopWinners
      }
    });

  } catch (error) {
    console.error('Error fetching Oscar overview:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Oscar overview data'
    }, { status: 500 });
  }
}