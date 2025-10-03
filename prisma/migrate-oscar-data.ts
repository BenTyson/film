import { PrismaClient as PrismaClientSQLite } from '../node_modules/.prisma/client-sqlite';
import { PrismaClient as PrismaClientPostgres } from '@prisma/client';

const sourceDb = new PrismaClientSQLite();
const targetDb = new PrismaClientPostgres();

interface IdMap {
  [oldId: number]: number;
}

async function migrateOscarData() {
  console.log('🏆 Starting Oscar data migration...\n');

  try {
    const oscarCategoryIdMap: IdMap = {};
    const oscarMovieIdMap: IdMap = {};

    // 1. Migrate Best Picture Nominees
    console.log('🎬 Migrating Best Picture nominees...');
    const sourceBestPicture = await sourceDb.bestPictureNominee.findMany({
      orderBy: { id: 'asc' },
    });

    for (const nominee of sourceBestPicture) {
      await targetDb.bestPictureNominee.create({
        data: {
          tmdb_id: nominee.tmdb_id,
          ceremony_year: nominee.ceremony_year,
          movie_title: nominee.movie_title,
          release_year: nominee.release_year,
          is_winner: nominee.is_winner,
          director: nominee.director,
        },
      });
    }
    console.log(`✅ Migrated ${sourceBestPicture.length} Best Picture nominees\n`);

    // 2. Migrate Oscar Categories
    console.log('📋 Migrating Oscar categories...');
    const sourceOscarCategories = await sourceDb.oscarCategory.findMany({
      orderBy: { id: 'asc' },
    });

    for (const category of sourceOscarCategories) {
      const newCategory = await targetDb.oscarCategory.create({
        data: {
          name: category.name,
          category_group: category.category_group,
          is_active: category.is_active,
        },
      });
      oscarCategoryIdMap[category.id] = newCategory.id;
    }
    console.log(`✅ Migrated ${sourceOscarCategories.length} Oscar categories\n`);

    // 3. Migrate Oscar Movies
    console.log('🎥 Migrating Oscar movies...');
    const sourceOscarMovies = await sourceDb.oscarMovie.findMany({
      orderBy: { id: 'asc' },
    });

    let oscarMovieCount = 0;
    for (const oscarMovie of sourceOscarMovies) {
      const newOscarMovie = await targetDb.oscarMovie.create({
        data: {
          tmdb_id: oscarMovie.tmdb_id,
          imdb_id: oscarMovie.imdb_id,
          title: oscarMovie.title,
        },
      });
      oscarMovieIdMap[oscarMovie.id] = newOscarMovie.id;
      oscarMovieCount++;

      if (oscarMovieCount % 100 === 0) {
        console.log(`   Migrated ${oscarMovieCount}/${sourceOscarMovies.length} Oscar movies...`);
      }
    }
    console.log(`✅ Migrated ${sourceOscarMovies.length} Oscar movies\n`);

    // 4. Migrate Oscar Nominations
    console.log('🏅 Migrating Oscar nominations...');
    const sourceOscarNominations = await sourceDb.oscarNomination.findMany({
      orderBy: { id: 'asc' },
    });

    let oscarNominationCount = 0;
    for (const nomination of sourceOscarNominations) {
      const newCategoryId = oscarCategoryIdMap[nomination.category_id];
      const newMovieId = nomination.movie_id ? oscarMovieIdMap[nomination.movie_id] : null;

      if (!newCategoryId) {
        console.warn(`   ⚠️  Skipping nomination ${nomination.id} - category ${nomination.category_id} not found`);
        continue;
      }

      await targetDb.oscarNomination.create({
        data: {
          ceremony_year: nomination.ceremony_year,
          category_id: newCategoryId,
          movie_id: newMovieId,
          nominee_name: nomination.nominee_name,
          is_winner: nomination.is_winner,
        },
      });
      oscarNominationCount++;

      if (oscarNominationCount % 100 === 0) {
        console.log(`   Migrated ${oscarNominationCount}/${sourceOscarNominations.length} Oscar nominations...`);
      }
    }
    console.log(`✅ Migrated ${oscarNominationCount} Oscar nominations\n`);

    // Summary
    console.log('🎉 Oscar data migration completed successfully!\n');
    console.log('📊 Final Oscar Data Summary:');
    console.log(`   Best Picture Nominees: ${await targetDb.bestPictureNominee.count()}`);
    console.log(`   Oscar Categories: ${await targetDb.oscarCategory.count()}`);
    console.log(`   Oscar Movies: ${await targetDb.oscarMovie.count()}`);
    console.log(`   Oscar Nominations: ${await targetDb.oscarNomination.count()}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  }
}

migrateOscarData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
