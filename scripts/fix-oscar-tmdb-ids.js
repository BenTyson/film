const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// TMDB ID corrections for newly added Oscar movies
const tmdbIdFixes = [
  {
    oldTmdbId: 831815,
    newTmdbId: 898713,
    title: 'Rustin',
    year: 2023
  },
  {
    oldTmdbId: 1100782,
    newTmdbId: 1155828,
    title: 'Sing Sing',
    year: 2023
  },
  {
    oldTmdbId: 939243,
    newTmdbId: 1182047,
    title: 'The Apprentice',
    year: 2024
  },
  {
    oldTmdbId: 974453,
    newTmdbId: 549509,
    title: 'The Brutalist',
    year: 2024
  }
];

async function fixTmdbIds() {
  try {
    console.log('🔧 Starting TMDB ID corrections for Oscar movies...\n');

    let totalFixed = 0;
    let totalErrors = 0;

    for (const fix of tmdbIdFixes) {
      try {
        console.log(`📝 Fixing: ${fix.title} (${fix.year})`);
        console.log(`   Old TMDB ID: ${fix.oldTmdbId} → New TMDB ID: ${fix.newTmdbId}`);

        // Check if the movie exists with the old TMDB ID
        const existingMovie = await prisma.oscarMovie.findFirst({
          where: { tmdb_id: fix.oldTmdbId }
        });

        if (!existingMovie) {
          console.log(`❌ Movie with old TMDB ID ${fix.oldTmdbId} not found`);
          totalErrors++;
          continue;
        }

        // Check if the new TMDB ID already exists
        const conflictingMovie = await prisma.oscarMovie.findFirst({
          where: { tmdb_id: fix.newTmdbId }
        });

        if (conflictingMovie && conflictingMovie.id !== existingMovie.id) {
          console.log(`⚠️  Conflict: TMDB ID ${fix.newTmdbId} already exists for movie ID ${conflictingMovie.id}`);
          console.log(`   Will need manual resolution for ${fix.title}`);
          totalErrors++;
          continue;
        }

        // Update the TMDB ID
        await prisma.oscarMovie.update({
          where: { id: existingMovie.id },
          data: { tmdb_id: fix.newTmdbId }
        });

        console.log(`✅ Successfully updated ${fix.title}`);
        totalFixed++;

      } catch (error) {
        console.error(`❌ Error fixing ${fix.title}:`, error.message);
        totalErrors++;
      }

      console.log(''); // Empty line for readability
    }

    console.log('='.repeat(50));
    console.log('📊 TMDB ID FIX SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Fixed: ${totalFixed}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log(`📝 Total processed: ${tmdbIdFixes.length}`);

    // Verification - show updated TMDB IDs
    console.log('\n🔍 Verification - Updated TMDB IDs:');
    for (const fix of tmdbIdFixes) {
      const movie = await prisma.oscarMovie.findFirst({
        where: { title: fix.title }
      });
      if (movie) {
        const status = movie.tmdb_id === fix.newTmdbId ? '✅' : '❌';
        console.log(`${status} ${fix.title}: ${movie.tmdb_id} (expected: ${fix.newTmdbId})`);
      }
    }

  } catch (error) {
    console.error('💥 Fatal error during TMDB ID fixes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixTmdbIds();