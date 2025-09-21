import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface BestPictureNominee {
  ceremony_year: number;
  movie_title: string;
  release_year: number;
  is_winner: boolean;
  tmdb_id?: number;
  director?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { force_reimport = false } = await request.json();

    // Load the Best Picture data from JSON file
    const dataPath = path.join(process.cwd(), 'src', 'data', 'best-picture-nominees.json');
    const bestPictureData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Check if data already exists
    const existingCount = await prisma.bestPictureNominee.count();
    if (existingCount > 0 && !force_reimport) {
      return NextResponse.json({
        success: false,
        error: 'Best Picture nominees already imported. Use force_reimport=true to reimport.',
        existing_count: existingCount
      }, { status: 400 });
    }

    // Clear existing data if force reimporting
    if (force_reimport) {
      await prisma.bestPictureNominee.deleteMany({});
    }

    const results = [];
    const stats = {
      total: bestPictureData.length,
      successful: 0,
      failed: 0,
      duplicates: 0
    };

    for (const nominee of bestPictureData as BestPictureNominee[]) {
      try {
        // Check for existing entry
        const existing = await prisma.bestPictureNominee.findUnique({
          where: {
            ceremony_year_movie_title: {
              ceremony_year: nominee.ceremony_year,
              movie_title: nominee.movie_title
            }
          }
        });

        if (existing && !force_reimport) {
          results.push({
            success: false,
            ceremony_year: nominee.ceremony_year,
            movie_title: nominee.movie_title,
            error: 'Already exists'
          });
          stats.duplicates++;
          continue;
        }

        // Create the nominee record
        const created = await prisma.bestPictureNominee.create({
          data: {
            ceremony_year: nominee.ceremony_year,
            movie_title: nominee.movie_title,
            release_year: nominee.release_year,
            is_winner: nominee.is_winner,
            tmdb_id: nominee.tmdb_id || null,
            director: nominee.director || null
          }
        });

        results.push({
          success: true,
          id: created.id,
          ceremony_year: nominee.ceremony_year,
          movie_title: nominee.movie_title,
          is_winner: nominee.is_winner
        });

        stats.successful++;

      } catch (error) {
        console.error(`Error importing nominee ${nominee.movie_title} (${nominee.ceremony_year}):`, error);
        results.push({
          success: false,
          ceremony_year: nominee.ceremony_year,
          movie_title: nominee.movie_title,
          error: 'Import failed'
        });
        stats.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        stats
      }
    });

  } catch (error) {
    console.error('Error importing Best Picture nominees:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to import Best Picture nominees'
    }, { status: 500 });
  }
}