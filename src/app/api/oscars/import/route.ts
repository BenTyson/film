import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

interface OscarEntry {
  tmdb_id: number;
  ceremony_year: number;
  category: string;
  nomination_type: 'nominated' | 'won';
  nominee_name?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oscar_entries, dry_run = false } = body;

    if (!oscar_entries || !Array.isArray(oscar_entries)) {
      return NextResponse.json({
        success: false,
        error: 'oscar_entries array is required'
      }, { status: 400 });
    }

    const results = [];
    const stats = {
      total: oscar_entries.length,
      successful: 0,
      failed: 0,
      movie_not_found: 0,
      duplicates: 0
    };

    for (const entry of oscar_entries as OscarEntry[]) {
      try {
        // Find the movie by TMDB ID
        const movie = await prisma.movie.findUnique({
          where: { tmdb_id: entry.tmdb_id }
        });

        if (!movie) {
          results.push({
            success: false,
            tmdb_id: entry.tmdb_id,
            error: 'Movie not found in collection'
          });
          stats.movie_not_found++;
          continue;
        }

        // Check for existing oscar data to avoid duplicates
        const existingOscar = await prisma.oscarData.findFirst({
          where: {
            movie_id: movie.id,
            ceremony_year: entry.ceremony_year,
            category: entry.category,
            nomination_type: entry.nomination_type
          }
        });

        if (existingOscar) {
          results.push({
            success: false,
            tmdb_id: entry.tmdb_id,
            movie_title: movie.title,
            error: 'Oscar data already exists'
          });
          stats.duplicates++;
          continue;
        }

        if (!dry_run) {
          // Create the oscar data
          const oscarData = await prisma.oscarData.create({
            data: {
              movie_id: movie.id,
              ceremony_year: entry.ceremony_year,
              category: entry.category,
              nomination_type: entry.nomination_type,
              nominee_name: entry.nominee_name || null
            }
          });

          results.push({
            success: true,
            tmdb_id: entry.tmdb_id,
            movie_title: movie.title,
            oscar_id: oscarData.id,
            ceremony_year: entry.ceremony_year,
            category: entry.category,
            nomination_type: entry.nomination_type
          });
        } else {
          results.push({
            success: true,
            tmdb_id: entry.tmdb_id,
            movie_title: movie.title,
            ceremony_year: entry.ceremony_year,
            category: entry.category,
            nomination_type: entry.nomination_type,
            dry_run: true
          });
        }

        stats.successful++;

      } catch (error) {
        console.error(`Error processing oscar entry for TMDB ${entry.tmdb_id}:`, error);
        results.push({
          success: false,
          tmdb_id: entry.tmdb_id,
          error: 'Processing failed'
        });
        stats.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        stats,
        dry_run
      }
    });

  } catch (error) {
    console.error('Error importing Oscar data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to import Oscar data'
    }, { status: 500 });
  }
}