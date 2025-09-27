const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixRustinAndImStillHere() {
  try {
    console.log('🔧 Fixing Rustin duplicate and I\'m Still Here TMDB ID...\n');

    // Step 1: Fix Rustin - update nominations to use the correct Rustin entry (ID 1149)
    console.log('📝 Step 1: Fixing Rustin nominations...');

    const rustinNominations = await prisma.oscarNomination.findMany({
      where: {
        movie: { title: 'Rustin' },
        ceremony_year: 2024
      },
      include: { movie: true }
    });

    console.log(`Found ${rustinNominations.length} Rustin nominations to fix`);

    for (const nomination of rustinNominations) {
      if (nomination.movie.tmdb_id === 831815) {
        // Update to use the correct Rustin movie (ID 1149 with TMDB ID 898713)
        await prisma.oscarNomination.update({
          where: { id: nomination.id },
          data: { movie_id: 1149 }
        });
        console.log(`✅ Updated nomination ${nomination.id} to use correct Rustin movie`);
      }
    }

    // Step 2: Delete the duplicate Rustin entry
    console.log('\n📝 Step 2: Removing duplicate Rustin entry...');
    await prisma.oscarMovie.delete({
      where: { id: 1161 } // The duplicate with TMDB ID 831815
    });
    console.log('✅ Deleted duplicate Rustin entry');

    // Step 3: Fix I'm Still Here TMDB ID
    console.log('\n📝 Step 3: Fixing I\'m Still Here TMDB ID...');

    const imStillHereMovie = await prisma.oscarMovie.findFirst({
      where: { title: 'I\'m Still Here' }
    });

    if (imStillHereMovie) {
      await prisma.oscarMovie.update({
        where: { id: imStillHereMovie.id },
        data: { tmdb_id: 1000837 }
      });
      console.log(`✅ Updated I'm Still Here TMDB ID from ${imStillHereMovie.tmdb_id} to 1000837`);
    } else {
      console.log('❌ I\'m Still Here movie not found');
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 FIX SUMMARY');
    console.log('='.repeat(50));
    console.log('✅ Fixed Rustin duplicate entries');
    console.log('✅ Updated I\'m Still Here TMDB ID');

    // Verification
    console.log('\n🔍 Verification:');
    const rustinCheck = await prisma.oscarMovie.findMany({
      where: { title: 'Rustin' }
    });
    console.log(`Rustin entries: ${rustinCheck.length} (should be 1)`);
    rustinCheck.forEach(movie => {
      console.log(`  - ID: ${movie.id}, TMDB ID: ${movie.tmdb_id}`);
    });

    const imStillHereCheck = await prisma.oscarMovie.findFirst({
      where: { title: 'I\'m Still Here' }
    });
    if (imStillHereCheck) {
      console.log(`I'm Still Here TMDB ID: ${imStillHereCheck.tmdb_id} (should be 1000837)`);
    }

  } catch (error) {
    console.error('💥 Fatal error during fixes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixRustinAndImStillHere();