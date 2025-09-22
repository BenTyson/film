import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get all Best Picture nominees
    const nominees = await prisma.bestPictureNominee.findMany({
      orderBy: [
        { ceremony_year: 'desc' },
        { movie_title: 'asc' }
      ]
    });

    const syncResults = {
      processed: 0,
      synced: 0,
      notInCollection: 0,
      errors: 0
    };

    for (const nominee of nominees) {
      syncResults.processed++;
      console.log(`\n--- Processing: ${nominee.movie_title} (${nominee.ceremony_year}) ---`);

      try {
        // Find the movie in the collection by TMDB ID or title
        // SQLite doesn't support mode: 'insensitive', so we'll use UPPER/LOWER functions
        const movie = await prisma.movie.findFirst({
          where: {
            OR: [
              // Try exact title match first (most reliable)
              { title: nominee.movie_title },
              // Try TMDB ID if it exists (most reliable)
              ...(nominee.tmdb_id ? [{ tmdb_id: nominee.tmdb_id }] : [])
            ]
          }
        });

        // If no match found, try case-insensitive search using raw SQL for SQLite
        let caseInsensitiveMovie = null;
        if (!movie) {
          caseInsensitiveMovie = await prisma.$queryRaw`
            SELECT * FROM movies
            WHERE UPPER(title) = UPPER(${nominee.movie_title})
            LIMIT 1
          `;
        }

        // Use the first available match
        const foundMovie = movie || (caseInsensitiveMovie && caseInsensitiveMovie.length > 0 ? caseInsensitiveMovie[0] : null);

        if (!foundMovie) {
          console.log(`❌ Movie not found in collection: ${nominee.movie_title}`);
          syncResults.notInCollection++;
          continue;
        }

        console.log(`✅ Found movie: ${foundMovie.title} (ID: ${foundMovie.id}, TMDB: ${foundMovie.tmdb_id})`);

        // Check if Oscar data already exists
        const existingOscar = await prisma.oscarData.findFirst({
          where: {
            movie_id: foundMovie.id,
            ceremony_year: nominee.ceremony_year,
            category: 'Best Picture'
          }
        });

        if (existingOscar) {
          console.log(`🔄 Found existing Oscar data (ID: ${existingOscar.id})`);
          // Update if needed
          const newNominationType = nominee.is_winner ? 'won' : 'nominated';
          if (existingOscar.nomination_type !== newNominationType) {
            console.log(`📝 Updating nomination type from '${existingOscar.nomination_type}' to '${newNominationType}'`);
            await prisma.oscarData.update({
              where: { id: existingOscar.id },
              data: {
                nomination_type: newNominationType
              }
            });
            console.log(`✅ Updated existing Oscar data`);
          } else {
            console.log(`ℹ️ No update needed - nomination type already correct`);
          }
        } else {
          console.log(`➕ Creating new Oscar data`);
          // Create new Oscar data
          const newOscarData = await prisma.oscarData.create({
            data: {
              movie_id: foundMovie.id,
              ceremony_year: nominee.ceremony_year,
              category: 'Best Picture',
              nomination_type: nominee.is_winner ? 'won' : 'nominated'
            }
          });
          console.log(`✅ Created new Oscar data (ID: ${newOscarData.id})`);
        }

        syncResults.synced++;
        console.log(`✅ Successfully synced ${nominee.movie_title}`);

      } catch (error) {
        console.error(`❌ Error syncing ${nominee.movie_title}:`, error);
        syncResults.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Oscar data synced successfully',
      stats: syncResults
    });

  } catch (error) {
    console.error('Error syncing Oscar data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync Oscar data'
    }, { status: 500 });
  }
}