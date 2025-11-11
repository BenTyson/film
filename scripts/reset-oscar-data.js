/**
 * Reset Oscar Data
 *
 * Completely deletes all Oscar data from the database:
 * - oscar_nominations (all rows)
 * - best_picture_nominees (all rows)
 * - oscar_data (all rows)
 * - oscar_movies (all rows)
 *
 * Keeps oscar_categories intact for reuse.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Reset Oscar Data - Complete Cleanup\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Step 1: Show current data counts
    console.log('📊 Current data counts:\n');

    const counts = {
      nominations: await prisma.oscarNomination.count(),
      bestPicture: await prisma.bestPictureNominee.count(),
      oscarData: await prisma.oscarData.count(),
      movies: await prisma.oscarMovie.count(),
      categories: await prisma.oscarCategory.count()
    };

    console.log(`   oscar_nominations: ${counts.nominations} records`);
    console.log(`   best_picture_nominees: ${counts.bestPicture} records`);
    console.log(`   oscar_data: ${counts.oscarData} records`);
    console.log(`   oscar_movies: ${counts.movies} records`);
    console.log(`   oscar_categories: ${counts.categories} records (will keep)\n`);

    const totalToDelete = counts.nominations + counts.bestPicture + counts.oscarData + counts.movies;
    console.log(`   Total records to delete: ${totalToDelete}\n`);

    // Step 2: Execute deletion in transaction
    console.log('🗑️  Deleting all Oscar data...\n');

    await prisma.$transaction(async (tx) => {
      // Delete in correct order to respect foreign key constraints
      console.log('   Deleting oscar_nominations...');
      await tx.oscarNomination.deleteMany({});

      console.log('   Deleting best_picture_nominees...');
      await tx.bestPictureNominee.deleteMany({});

      console.log('   Deleting oscar_data...');
      await tx.oscarData.deleteMany({});

      console.log('   Deleting oscar_movies...');
      await tx.oscarMovie.deleteMany({});
    });

    console.log('\n   ✓ All Oscar data deleted successfully\n');

    // Step 3: Verify deletion
    console.log('✅ Verification:\n');

    const finalCounts = {
      nominations: await prisma.oscarNomination.count(),
      bestPicture: await prisma.bestPictureNominee.count(),
      oscarData: await prisma.oscarData.count(),
      movies: await prisma.oscarMovie.count(),
      categories: await prisma.oscarCategory.count()
    };

    console.log(`   oscar_nominations: ${finalCounts.nominations} records`);
    console.log(`   best_picture_nominees: ${finalCounts.bestPicture} records`);
    console.log(`   oscar_data: ${finalCounts.oscarData} records`);
    console.log(`   oscar_movies: ${finalCounts.movies} records`);
    console.log(`   oscar_categories: ${finalCounts.categories} records (preserved)\n`);

    const allDeleted = finalCounts.nominations === 0 &&
                       finalCounts.bestPicture === 0 &&
                       finalCounts.oscarData === 0 &&
                       finalCounts.movies === 0;

    if (allDeleted) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ SUCCESS! All Oscar data has been deleted.\n');
      console.log('Next steps:');
      console.log('   1. Import fresh Oscar data');
      console.log('   2. Table view UI is ready at /oscars page\n');
    } else {
      throw new Error('Some records were not deleted!');
    }

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    console.error('\n   The database transaction has been rolled back.');
    console.error('   No data was modified.\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
