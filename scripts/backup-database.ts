import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function backupDatabase() {
  console.log('Starting database backup...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(process.cwd(), 'backups');

  try {
    // Fetch all data
    console.log('Fetching movies...');
    const movies = await prisma.movie.findMany();

    console.log('Fetching user movies...');
    const userMovies = await prisma.userMovie.findMany();

    console.log('Fetching Oscar data...');
    const oscarData = await prisma.oscarData.findMany();

    console.log('Fetching Oscar categories...');
    const oscarCategories = await prisma.oscarCategory.findMany();

    console.log('Fetching Oscar movies...');
    const oscarMovies = await prisma.oscarMovie.findMany();

    console.log('Fetching Oscar nominations...');
    const oscarNominations = await prisma.oscarNomination.findMany();

    console.log('Fetching watchlist movies...');
    const watchlistMovies = await prisma.watchlistMovie.findMany();

    console.log('Fetching tags...');
    const tags = await prisma.tag.findMany();

    console.log('Fetching movie tags...');
    const movieTags = await prisma.movieTag.findMany();

    console.log('Fetching watchlist tags...');
    const watchlistTags = await prisma.watchlistTag.findMany();

    console.log('Fetching best picture nominees...');
    const bestPictureNominees = await prisma.bestPictureNominee.findMany();

    console.log('Fetching movie match analysis...');
    const movieMatchAnalysis = await prisma.movieMatchAnalysis.findMany();

    // Create backup object
    const backup = {
      timestamp,
      version: '1.0',
      counts: {
        movies: movies.length,
        userMovies: userMovies.length,
        oscarData: oscarData.length,
        oscarCategories: oscarCategories.length,
        oscarMovies: oscarMovies.length,
        oscarNominations: oscarNominations.length,
        watchlistMovies: watchlistMovies.length,
        tags: tags.length,
        movieTags: movieTags.length,
        watchlistTags: watchlistTags.length,
        bestPictureNominees: bestPictureNominees.length,
        movieMatchAnalysis: movieMatchAnalysis.length,
      },
      data: {
        movies,
        userMovies,
        oscarData,
        oscarCategories,
        oscarMovies,
        oscarNominations,
        watchlistMovies,
        tags,
        movieTags,
        watchlistTags,
        bestPictureNominees,
        movieMatchAnalysis,
      }
    };

    // Write backup file with BigInt handling
    const filename = `backup-${timestamp}.json`;
    const filepath = join(backupDir, filename);

    // Handle BigInt serialization
    const jsonString = JSON.stringify(backup, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2);

    writeFileSync(filepath, jsonString);

    console.log('\n✅ Backup completed successfully!');
    console.log(`📁 File: ${filepath}`);
    console.log(`📊 Records backed up:`);
    console.log(`   - Movies: ${movies.length}`);
    console.log(`   - User Movies: ${userMovies.length}`);
    console.log(`   - Oscar Data: ${oscarData.length}`);
    console.log(`   - Oscar Categories: ${oscarCategories.length}`);
    console.log(`   - Oscar Movies: ${oscarMovies.length}`);
    console.log(`   - Oscar Nominations: ${oscarNominations.length}`);
    console.log(`   - Watchlist Movies: ${watchlistMovies.length}`);
    console.log(`   - Tags: ${tags.length}`);
    console.log(`   - Movie Tags: ${movieTags.length}`);
    console.log(`   - Watchlist Tags: ${watchlistTags.length}`);
    console.log(`   - Best Picture Nominees: ${bestPictureNominees.length}`);
    console.log(`   - Movie Match Analysis: ${movieMatchAnalysis.length}`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
