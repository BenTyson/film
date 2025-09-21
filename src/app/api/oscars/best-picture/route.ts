import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const winnerOnly = searchParams.get('winner_only') === 'true';

    // Build where clause
    const where: any = {};
    if (year) {
      where.ceremony_year = parseInt(year);
    }
    if (winnerOnly) {
      where.is_winner = true;
    }

    // Get Best Picture nominees with their watch status
    const nominees = await prisma.bestPictureNominee.findMany({
      where,
      orderBy: [
        { ceremony_year: 'desc' },
        { is_winner: 'desc' }, // Winners first
        { movie_title: 'asc' }
      ]
    });

    // Enhanced matching algorithm with multiple fallback strategies
    function normalizeTitle(title: string): string {
      return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\b(the|a|an)\b/g, '') // Remove articles
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    }

    function calculateYearDifference(date1: Date | null, year2: number): number {
      if (!date1) return Infinity;
      const year1 = date1.getFullYear();
      return Math.abs(year1 - year2);
    }

    function findBestMatch(nominee: any, movies: any[]): { movie: any; confidence: number; matchType: string } | null {
      let bestMatch = null;
      let highestConfidence = 0;
      let matchType = '';

      for (const movie of movies) {
        let confidence = 0;
        let currentMatchType = '';

        // Priority 1: TMDB ID exact match (100% confidence)
        if (nominee.tmdb_id && movie.tmdb_id === nominee.tmdb_id) {
          return { movie, confidence: 100, matchType: 'tmdb_id' };
        }

        // Priority 2: Exact title + year match (95% confidence)
        const exactTitleMatch = movie.title.toLowerCase() === nominee.movie_title.toLowerCase();
        const yearDiff = calculateYearDifference(movie.release_date, nominee.release_year || 0);

        if (exactTitleMatch && yearDiff <= 1) {
          confidence = 95;
          currentMatchType = 'exact_title_year';
        }
        // Priority 3: Exact title match (90% confidence)
        else if (exactTitleMatch) {
          confidence = 90;
          currentMatchType = 'exact_title';
        }
        // Priority 4: Normalized title + year match (85% confidence)
        else {
          const normalizedNomineeTitle = normalizeTitle(nominee.movie_title);
          const normalizedMovieTitle = normalizeTitle(movie.title);
          const normalizedOriginalTitle = movie.original_title ? normalizeTitle(movie.original_title) : '';
          const normalizedCsvTitle = movie.csv_title ? normalizeTitle(movie.csv_title) : '';

          const titleMatches = [
            normalizedMovieTitle === normalizedNomineeTitle,
            normalizedOriginalTitle === normalizedNomineeTitle,
            normalizedCsvTitle === normalizedNomineeTitle
          ];

          if (titleMatches.some(match => match) && yearDiff <= 1) {
            confidence = 85;
            currentMatchType = 'normalized_title_year';
          }
          // Priority 5: Normalized title match (75% confidence)
          else if (titleMatches.some(match => match)) {
            confidence = 75;
            currentMatchType = 'normalized_title';
          }
          // Priority 6: Partial title match + year (65% confidence)
          else if (yearDiff <= 1) {
            const partialMatches = [
              normalizedMovieTitle.includes(normalizedNomineeTitle) || normalizedNomineeTitle.includes(normalizedMovieTitle),
              normalizedOriginalTitle && (normalizedOriginalTitle.includes(normalizedNomineeTitle) || normalizedNomineeTitle.includes(normalizedOriginalTitle)),
              normalizedCsvTitle && (normalizedCsvTitle.includes(normalizedNomineeTitle) || normalizedNomineeTitle.includes(normalizedCsvTitle))
            ];

            if (partialMatches.some(match => match)) {
              confidence = 65;
              currentMatchType = 'partial_title_year';
            }
          }
          // Priority 7: Director + year match (if director data available) (60% confidence)
          else if (nominee.director && movie.director && yearDiff <= 2) {
            const directorMatch = movie.director.toLowerCase().includes(nominee.director.toLowerCase()) ||
                                nominee.director.toLowerCase().includes(movie.director.toLowerCase());
            if (directorMatch) {
              confidence = 60;
              currentMatchType = 'director_year';
            }
          }
        }

        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = movie;
          matchType = currentMatchType;
        }
      }

      return bestMatch ? { movie: bestMatch, confidence: highestConfidence, matchType } : null;
    }

    // Get all movies to search through
    const allMovies = await prisma.movie.findMany({
      include: {
        user_movies: true
      }
    });

    // Map to include watch status with enhanced matching
    const enrichedNominees = await Promise.all(nominees.map(async (nominee) => {
      const matchResult = findBestMatch(nominee, allMovies);
      const movie = matchResult?.movie;
      const userMovie = movie?.user_movies?.[0];

      // If movie is not in collection but has TMDB ID, fetch poster from TMDB
      let posterPath = movie?.poster_path || null;
      if (!movie && nominee.tmdb_id) {
        try {
          const tmdbResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${nominee.tmdb_id}`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.TMDB_API_KEY}`,
              },
            }
          );
          if (tmdbResponse.ok) {
            const tmdbData = await tmdbResponse.json();
            posterPath = tmdbData.poster_path;
          }
        } catch (error) {
          console.error(`Failed to fetch TMDB data for ${nominee.movie_title}:`, error);
        }
      }

      return {
        ...nominee,
        in_collection: !!movie,
        watched: !!userMovie?.date_watched,
        personal_rating: userMovie?.personal_rating || null,
        date_watched: userMovie?.date_watched || null,
        match_confidence: matchResult?.confidence || 0,
        match_type: matchResult?.matchType || 'no_match',
        movie_details: movie ? {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date
        } : {
          id: null,
          title: nominee.movie_title,
          poster_path: posterPath,
          release_date: null
        }
      };
    }));

    // Group by ceremony year
    const groupedByYear = enrichedNominees.reduce((acc, nominee) => {
      const year = nominee.ceremony_year;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(nominee);
      return acc;
    }, {} as Record<number, typeof enrichedNominees>);

    // Calculate statistics
    const stats = {
      total_nominees: nominees.length,
      total_winners: nominees.filter(n => n.is_winner).length,
      in_collection: enrichedNominees.filter(n => n.in_collection).length,
      watched: enrichedNominees.filter(n => n.watched).length,
      unwatched_nominees: enrichedNominees.filter(n => !n.watched).length,
      years_covered: Object.keys(groupedByYear).length
    };

    return NextResponse.json({
      success: true,
      data: {
        nominees: enrichedNominees,
        grouped_by_year: groupedByYear,
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching Best Picture nominees:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Best Picture nominees'
    }, { status: 500 });
  }
}