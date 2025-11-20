import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch all Oscar movies with their nominations
    const oscarMovies = await prisma.oscar_movies.findMany({
      include: {
        oscar_nominations: {
          include: {
            oscar_categories: true
          }
        }
      },
      orderBy: {
        title: 'asc'
      }
    });

    // Get user's movie collection for TMDB ID matching and poster paths
    const userMovies = await prisma.movies.findMany({
      where: { approval_status: 'approved' },
      select: { tmdb_id: true, id: true, poster_path: true }
    });

    // Create lookup map for fast TMDB ID matching
    const userMovieMap = new Map(userMovies.map(m => [m.tmdb_id, m]));

    // Transform data for table view
    const tableData = oscarMovies.map(movie => {
      // Get unique ceremony years
      const ceremonyYears = [...new Set(movie.oscar_nominations.map(n => n.ceremony_year))].sort();

      // Count wins and total nominations
      const winCount = movie.oscar_nominations.filter(n => n.is_winner).length;
      const nominationCount = movie.oscar_nominations.length;

      // Check if in user's collection
      const collectionMovie = movie.tmdb_id ? userMovieMap.get(movie.tmdb_id) : null;
      const inCollection = !!collectionMovie;

      // Format nominations with category, win status, and person data
      const formattedNominations = movie.oscar_nominations.map(nom => ({
        category: nom.oscar_categories?.name || 'Unknown',
        ceremony_year: nom.ceremony_year,
        is_winner: nom.is_winner,
        nominee_name: nom.nominee_name,
        person_id: nom.person_id,
        profile_path: nom.profile_path
      }));

      return {
        oscar_movie_id: movie.id,
        tmdb_id: movie.tmdb_id,
        imdb_id: movie.imdb_id,
        title: movie.title,
        poster_path: movie.poster_path || collectionMovie?.poster_path || null,
        ceremony_years: ceremonyYears,
        nominations: formattedNominations,
        win_count: winCount,
        nomination_count: nominationCount,
        in_collection: inCollection,
        collection_id: collectionMovie?.id || null
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        movies: tableData,
        total_count: tableData.length
      }
    });

  } catch (error) {
    console.error('Error fetching Oscar table data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Oscar table data'
    }, { status: 500 });
  }
}
