#!/usr/bin/env npx tsx

import { prisma } from '../src/lib/prisma';

async function resetDatabase() {
  console.log('🗑️  Starting database reset...');

  try {
    // Disable foreign key constraints temporarily for SQLite
    await prisma.$executeRaw`PRAGMA foreign_keys = OFF`;

    // Delete in order to avoid foreign key conflicts
    console.log('Clearing movie_match_analysis...');
    await prisma.movie_match_analysis.deleteMany();

    console.log('Clearing movie_tags...');
    await prisma.movie_tags.deleteMany();

    console.log('Clearing oscar_data...');
    await prisma.oscar_data.deleteMany();

    console.log('Clearing user_movies...');
    await prisma.user_movies.deleteMany();

    console.log('Clearing movies...');
    await prisma.movies.deleteMany();

    console.log('Clearing tags...');
    await prisma.tags.deleteMany();

    // Re-enable foreign key constraints
    await prisma.$executeRaw`PRAGMA foreign_keys = ON`;

    // Reset auto-increment counters for SQLite
    console.log('Resetting auto-increment counters...');
    await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name='movies'`;
    await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name='user_movies'`;
    await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name='oscar_data'`;
    await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name='tags'`;
    await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name='movie_tags'`;
    await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name='movie_match_analysis'`;

    // Get final counts to verify
    const counts = await Promise.all([
      prisma.movies.count(),
      prisma.user_movies.count(),
      prisma.oscar_data.count(),
      prisma.tags.count(),
      prisma.movie_tags.count(),
      prisma.movie_match_analysis.count()
    ]);

    console.log('📊 Final verification:');
    console.log(`- Movies: ${counts[0]}`);
    console.log(`- User Movies: ${counts[1]}`);
    console.log(`- Oscar Data: ${counts[2]}`);
    console.log(`- Tags: ${counts[3]}`);
    console.log(`- Movie Tags: ${counts[4]}`);
    console.log(`- Match Analysis: ${counts[5]}`);

    if (counts.every(count => count === 0)) {
      console.log('✅ Database reset completed successfully!');
      console.log('🆕 Ready for clean import');
    } else {
      console.log('⚠️  Warning: Some tables still contain data');
    }

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset if this script is executed directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('Database reset completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to reset database:', error);
      process.exit(1);
    });
}

export { resetDatabase };