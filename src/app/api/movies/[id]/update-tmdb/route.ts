import { prisma } from '@/lib/prisma';
import { tmdb } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const movieId = parseInt(id);
    const body = await request.json();
    const { newTmdbId, tmdb_id, reason = 'Manual update' } = body;

    // Handle both newTmdbId (from Fix modal) and tmdb_id (from other sources)
    const targetTmdbId = newTmdbId || tmdb_id;

    console.log('Update TMDB request:', { movieId, newTmdbId, tmdb_id, targetTmdbId, reason, body });

    if (isNaN(movieId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid movie ID' },
        { status: 400 }
      );
    }

    const tmdbIdNumber = parseInt(targetTmdbId);
    if (!targetTmdbId || isNaN(tmdbIdNumber) || tmdbIdNumber <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid TMDB ID is required' },
        { status: 400 }
      );
    }

    // Check if movie exists
    const existingMovie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: {
        id: true,
        tmdb_id: true,
        title: true,
        csv_title: true,
        csv_director: true,
        csv_year: true,
        csv_row_number: true,
        approval_status: true  // Get current approval status
      }
    });

    if (!existingMovie) {
      return NextResponse.json(
        { success: false, error: 'Movie not found' },
        { status: 404 }
      );
    }

    // Check if new TMDB ID is already in use
    const duplicateMovie = await prisma.movie.findUnique({
      where: { tmdb_id: tmdbIdNumber }
    });

    if (duplicateMovie && duplicateMovie.id !== movieId) {
      return NextResponse.json(
        { success: false, error: 'This TMDB movie is already in your collection' },
        { status: 409 }
      );
    }

    // Get new movie details from TMDB
    const movieDetails = await tmdb.getMovieDetails(tmdbIdNumber);
    const credits = await tmdb.getMovieCredits(tmdbIdNumber);
    const director = tmdb.findDirector(credits);

    // Use transaction to update movie and create/update match analysis
    const updatedMovie = await prisma.$transaction(async (tx) => {
      // Update movie with new TMDB data
      const updated = await tx.movie.update({
        where: { id: movieId },
        data: {
          tmdb_id: tmdbIdNumber,
          title: movieDetails.title,
          original_title: movieDetails.original_title,
          release_date: movieDetails.release_date ? new Date(movieDetails.release_date) : null,
          overview: movieDetails.overview,
          poster_path: movieDetails.poster_path,
          backdrop_path: movieDetails.backdrop_path,
          vote_average: movieDetails.vote_average,
          vote_count: movieDetails.vote_count,
          popularity: movieDetails.popularity,
          genres: movieDetails.genres || null,
          director: director || null,
          runtime: movieDetails.runtime,
          budget: movieDetails.budget,
          revenue: movieDetails.revenue,
          tagline: movieDetails.tagline,
          // Keep existing approval status - don't reset if already approved
          approval_status: existingMovie.approval_status === 'approved' ? 'approved' : 'pending',
          updated_at: new Date()
        }
      });

      // If movie has CSV data, create new match analysis with the corrected data
      if (existingMovie.csv_row_number) {
        // Calculate new match quality with corrected data
        const titleSimilarity = calculateStringSimilarity(
          existingMovie.csv_title || '',
          movieDetails.title
        );
        const directorSimilarity = calculateStringSimilarity(
          existingMovie.csv_director || '',
          director || ''
        );

        let yearDifference = 0;
        if (existingMovie.csv_year && movieDetails.release_date) {
          const csvYear = parseInt(existingMovie.csv_year);
          const movieYear = new Date(movieDetails.release_date).getFullYear();
          yearDifference = Math.abs(csvYear - movieYear);
        }

        // Calculate overall confidence score
        let confidenceScore = 100;
        const mismatches: string[] = [];

        if (titleSimilarity < 80) {
          mismatches.push(`Title: "${existingMovie.csv_title}" vs "${movieDetails.title}"`);
          confidenceScore -= (100 - titleSimilarity) * 0.6;
        }

        if (directorSimilarity < 80 && existingMovie.csv_director && director) {
          mismatches.push(`Director: "${existingMovie.csv_director}" vs "${director}"`);
          confidenceScore -= (100 - directorSimilarity) * 0.3;
        }

        if (yearDifference > 1) {
          mismatches.push(`Year: ${existingMovie.csv_year} vs ${new Date(movieDetails.release_date).getFullYear()}`);
          confidenceScore -= Math.min(yearDifference * 5, 30);
        }

        const severity = confidenceScore < 50 ? 'high' :
                        confidenceScore < 80 ? 'medium' : 'low';

        // Update or create match analysis
        await tx.movieMatchAnalysis.upsert({
          where: { movie_id: movieId },
          create: {
            movie_id: movieId,
            confidence_score: Math.max(0, Math.round(confidenceScore)),
            severity,
            mismatches,
            title_similarity: titleSimilarity,
            director_similarity: directorSimilarity,
            year_difference: yearDifference
          },
          update: {
            confidence_score: Math.max(0, Math.round(confidenceScore)),
            severity,
            mismatches,
            title_similarity: titleSimilarity,
            director_similarity: directorSimilarity,
            year_difference: yearDifference,
            updated_at: new Date()
          }
        });
      }

      return updated;
    });

    // Convert BigInt fields to strings for JSON serialization
    const serializedMovie = {
      ...updatedMovie,
      id: Number(updatedMovie.id),
      budget: updatedMovie.budget ? Number(updatedMovie.budget) : null,
      revenue: updatedMovie.revenue ? Number(updatedMovie.revenue) : null,
      created_at: updatedMovie.created_at?.toISOString(),
      updated_at: updatedMovie.updated_at?.toISOString(),
      approved_at: updatedMovie.approved_at?.toISOString(),
      release_date: updatedMovie.release_date?.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: {
        movie: serializedMovie,
        message: `Movie successfully updated to "${movieDetails.title}"`
      }
    });

  } catch (error) {
    console.error('Error updating movie TMDB association:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update movie association' },
      { status: 500 }
    );
  }
}

// Helper function for string similarity (same as in backfill API)
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;

  // Calculate Levenshtein distance
  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);

  return Math.round((1 - distance / maxLength) * 100);
}