import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { dryRun = false } = await request.json();

    console.log('🔄 Starting Oscar integration with movie collection...');

    // Get all Oscar movies with their nominations
    const oscarMovies = await prisma.oscarMovie.findMany({
      where: {
        tmdb_id: { not: null }
      },
      include: {
        nominations: {
          include: {
            category: true
          }
        }
      }
    });

    console.log(`📊 Found ${oscarMovies.length} Oscar movies with TMDB IDs`);

    // Get all movies in the collection
    const collectionMovies = await prisma.movie.findMany({
      select: {
        id: true,
        tmdb_id: true,
        title: true
      }
    });

    const collectionByTmdbId = new Map(
      collectionMovies.map(m => [m.tmdb_id, m])
    );

    console.log(`📚 Found ${collectionMovies.length} movies in collection`);

    const stats = {
      oscar_movies_checked: oscarMovies.length,
      collection_movies_total: collectionMovies.length,
      matches_found: 0,
      oscar_data_created: 0,
      movies_with_nominations: [],
      sample_matches: []
    };

    if (!dryRun) {
      // Clear existing oscar_data entries to avoid duplicates
      await prisma.oscarData.deleteMany();
      console.log('🗑️  Cleared existing oscar_data entries');
    }

    // Process each Oscar movie
    for (const oscarMovie of oscarMovies) {
      if (!oscarMovie.tmdb_id) continue;

      const collectionMovie = collectionByTmdbId.get(oscarMovie.tmdb_id);

      if (collectionMovie) {
        stats.matches_found++;

        // Group nominations by category
        const nominationsByCategory = new Map();
        for (const nom of oscarMovie.nominations) {
          const key = `${nom.ceremony_year}-${nom.category.name}`;
          if (!nominationsByCategory.has(key)) {
            nominationsByCategory.set(key, {
              ceremony_year: nom.ceremony_year,
              category: nom.category.name,
              is_winner: nom.is_winner,
              nominee_name: nom.nominee_name
            });
          }
        }

        if (!dryRun) {
          // Create OscarData entries for each unique category/year combination
          for (const [key, data] of nominationsByCategory) {
            await prisma.oscarData.create({
              data: {
                movie_id: collectionMovie.id,
                ceremony_year: data.ceremony_year,
                category: data.category,
                is_winner: data.is_winner
              }
            });
            stats.oscar_data_created++;
          }
        }

        // Add to sample matches for first 10
        if (stats.sample_matches.length < 10) {
          stats.sample_matches.push({
            title: collectionMovie.title,
            tmdb_id: collectionMovie.tmdb_id,
            nominations: Array.from(nominationsByCategory.values())
          });
        }

        stats.movies_with_nominations.push({
          title: collectionMovie.title,
          nomination_count: oscarMovie.nominations.length,
          wins: oscarMovie.nominations.filter(n => n.is_winner).length
        });
      }
    }

    // Sort movies by nomination count
    stats.movies_with_nominations.sort((a, b) => b.nomination_count - a.nomination_count);

    // Get top nominated movies
    const topNominated = stats.movies_with_nominations.slice(0, 10);

    // Calculate additional statistics
    const moviesWithWins = stats.movies_with_nominations.filter(m => m.wins > 0);
    const totalNominations = stats.movies_with_nominations.reduce((sum, m) => sum + m.nomination_count, 0);
    const totalWins = stats.movies_with_nominations.reduce((sum, m) => sum + m.wins, 0);

    console.log('✅ Oscar integration completed!');
    console.log(`   Matches found: ${stats.matches_found}`);
    console.log(`   Oscar data entries created: ${stats.oscar_data_created}`);

    return NextResponse.json({
      success: true,
      message: dryRun ? 'Dry run completed - no changes made' : 'Oscar data integrated successfully',
      stats: {
        ...stats,
        top_nominated: topNominated,
        movies_with_wins: moviesWithWins.length,
        total_nominations: totalNominations,
        total_wins: totalWins,
        integration_rate: ((stats.matches_found / oscarMovies.length) * 100).toFixed(1) + '%'
      }
    });

  } catch (error) {
    console.error('Error integrating Oscar data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to integrate Oscar data'
    }, { status: 500 });
  }
}

// GET endpoint to check current integration status
export async function GET() {
  try {
    // Count movies with Oscar data
    const moviesWithOscars = await prisma.movie.count({
      where: {
        oscar_data: {
          some: {}
        }
      }
    });

    // Get total Oscar data entries
    const totalOscarData = await prisma.oscarData.count();

    // Get breakdown by category
    const categoryBreakdown = await prisma.oscarData.groupBy({
      by: ['category'],
      _count: true,
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    });

    // Get recent winners in collection
    const recentWinners = await prisma.oscarData.findMany({
      where: {
        is_winner: true
      },
      include: {
        movie: {
          select: {
            title: true,
            tmdb_id: true,
            release_date: true
          }
        }
      },
      orderBy: {
        ceremony_year: 'desc'
      },
      take: 10
    });

    return NextResponse.json({
      success: true,
      data: {
        integration_status: {
          movies_with_oscar_data: moviesWithOscars,
          total_oscar_entries: totalOscarData,
          categories: categoryBreakdown.map(c => ({
            category: c.category,
            count: c._count
          })),
          recent_winners: recentWinners.map(w => ({
            title: w.movie.title,
            year: w.ceremony_year,
            category: w.category
          }))
        }
      }
    });
  } catch (error) {
    console.error('Error checking integration status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check integration status'
    }, { status: 500 });
  }
}