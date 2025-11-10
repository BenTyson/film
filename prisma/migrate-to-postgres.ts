/* eslint-disable @typescript-eslint/no-require-imports */
import { PrismaClient as PrismaClientSQLite } from '../node_modules/.prisma/client-sqlite';
import { PrismaClient as PrismaClientPostgres } from '@prisma/client';

// Source database (SQLite)
const sourceDb = new PrismaClientSQLite();

// Target database (PostgreSQL on Railway)
const targetDb = new PrismaClientPostgres();

interface IdMap {
  [oldId: number]: number;
}

async function migrateData() {
  console.log('🚀 Starting migration from SQLite to PostgreSQL...\n');

  try {
    // Check if target database already has data
    const existingMovies = await targetDb.movie.count();
    if (existingMovies > 0) {
      console.warn(`⚠️  Target database already has ${existingMovies} movies.`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      await new Promise<void>((resolve) => {
        readline.question('Do you want to clear it and continue? (yes/no): ', (answer: string) => {
          readline.close();
          if (answer.toLowerCase() === 'yes') {
            resolve();
          } else {
            console.log('❌ Migration cancelled.');
            process.exit(0);
          }
        });
      });

      // Clear existing data in correct order
      console.log('🗑️  Clearing existing data...');
      await targetDb.movieTag.deleteMany({});
      await targetDb.oscarData.deleteMany({});
      await targetDb.userMovie.deleteMany({});
      await targetDb.movieMatchAnalysis.deleteMany({});
      await targetDb.oscarNomination.deleteMany({});
      await targetDb.movie.deleteMany({});
      await targetDb.tag.deleteMany({});
      await targetDb.oscarCategory.deleteMany({});
      await targetDb.oscarMovie.deleteMany({});
      await targetDb.bestPictureNominee.deleteMany({});
      console.log('✅ Cleared existing data\n');
    }

    // ID mapping to handle foreign key relationships
    const movieIdMap: IdMap = {};
    const tagIdMap: IdMap = {};
    const oscarCategoryIdMap: IdMap = {};
    const oscarMovieIdMap: IdMap = {};

    // 1. Migrate Movies
    console.log('📽️  Migrating movies...');
    const sourceMovies = await sourceDb.movie.findMany({
      orderBy: { id: 'asc' },
    });

    let movieCount = 0;
    const batchSize = 100;

    for (let i = 0; i < sourceMovies.length; i += batchSize) {
      const batch = sourceMovies.slice(i, i + batchSize);

      for (const movie of batch) {
        const newMovie = await targetDb.movie.create({
          data: {
            tmdb_id: movie.tmdb_id,
            title: movie.title,
            original_title: movie.original_title,
            release_date: movie.release_date,
            director: movie.director,
            overview: movie.overview,
            poster_path: movie.poster_path,
            backdrop_path: movie.backdrop_path,
            runtime: movie.runtime,
            genres: movie.genres,
            vote_average: movie.vote_average,
            vote_count: movie.vote_count,
            popularity: movie.popularity,
            budget: movie.budget,
            revenue: movie.revenue,
            tagline: movie.tagline,
            imdb_id: movie.imdb_id,
            imdb_rating: movie.imdb_rating,
            csv_row_number: movie.csv_row_number,
            csv_title: movie.csv_title,
            csv_director: movie.csv_director,
            csv_year: movie.csv_year,
            csv_notes: movie.csv_notes,
            approval_status: movie.approval_status,
            approved_at: movie.approved_at,
            approved_by: movie.approved_by,
          },
        });

        movieIdMap[movie.id] = newMovie.id;
        movieCount++;
      }

      console.log(`   Migrated ${movieCount}/${sourceMovies.length} movies...`);
    }
    console.log(`✅ Migrated ${movieCount} movies\n`);

    // 2. Migrate Tags
    console.log('🏷️  Migrating tags...');
    const sourceTags = await sourceDb.tag.findMany({
      orderBy: { id: 'asc' },
    });

    for (const tag of sourceTags) {
      const newTag = await targetDb.tag.create({
        data: {
          name: tag.name,
          color: tag.color,
          icon: tag.icon,
        },
      });
      tagIdMap[tag.id] = newTag.id;
    }
    console.log(`✅ Migrated ${sourceTags.length} tags\n`);

    // 3. Migrate UserMovies
    console.log('👤 Migrating user movie data...');
    const sourceUserMovies = await sourceDb.userMovie.findMany({
      orderBy: { id: 'asc' },
    });

    let userMovieCount = 0;
    for (let i = 0; i < sourceUserMovies.length; i += batchSize) {
      const batch = sourceUserMovies.slice(i, i + batchSize);

      for (const userMovie of batch) {
        const newMovieId = movieIdMap[userMovie.movie_id];
        if (!newMovieId) {
          console.warn(`   ⚠️  Skipping user_movie ${userMovie.id} - movie ${userMovie.movie_id} not found`);
          continue;
        }

        await targetDb.userMovie.create({
          data: {
            movie_id: newMovieId,
            user_id: userMovie.user_id,
            date_watched: userMovie.date_watched,
            personal_rating: userMovie.personal_rating,
            notes: userMovie.notes,
            is_favorite: userMovie.is_favorite,
            buddy_watched_with: userMovie.buddy_watched_with,
            watch_location: userMovie.watch_location,
          },
        });
        userMovieCount++;
      }

      console.log(`   Migrated ${userMovieCount}/${sourceUserMovies.length} user movie records...`);
    }
    console.log(`✅ Migrated ${userMovieCount} user movie records\n`);

    // 4. Migrate OscarData
    console.log('🏆 Migrating Oscar data...');
    const sourceOscarData = await sourceDb.oscarData.findMany({
      orderBy: { id: 'asc' },
    });

    let oscarCount = 0;
    for (const oscar of sourceOscarData) {
      const newMovieId = movieIdMap[oscar.movie_id];
      if (!newMovieId) {
        console.warn(`   ⚠️  Skipping oscar_data ${oscar.id} - movie ${oscar.movie_id} not found`);
        continue;
      }

      await targetDb.oscarData.create({
        data: {
          movie_id: newMovieId,
          ceremony_year: oscar.ceremony_year,
          category: oscar.category,
          is_winner: oscar.is_winner,
          nominee_name: oscar.nominee_name,
        },
      });
      oscarCount++;
    }
    console.log(`✅ Migrated ${oscarCount} Oscar records\n`);

    // 5. Migrate MovieTags
    console.log('🔗 Migrating movie-tag associations...');
    const sourceMovieTags = await sourceDb.movieTag.findMany({
      orderBy: { id: 'asc' },
    });

    let movieTagCount = 0;
    for (const movieTag of sourceMovieTags) {
      const newMovieId = movieIdMap[movieTag.movie_id];
      const newTagId = tagIdMap[movieTag.tag_id];

      if (!newMovieId || !newTagId) {
        console.warn(`   ⚠️  Skipping movie_tag ${movieTag.id} - movie ${movieTag.movie_id} or tag ${movieTag.tag_id} not found`);
        continue;
      }

      await targetDb.movieTag.create({
        data: {
          movie_id: newMovieId,
          tag_id: newTagId,
        },
      });
      movieTagCount++;
    }
    console.log(`✅ Migrated ${movieTagCount} movie-tag associations\n`);

    // 6. Migrate MovieMatchAnalysis (if any)
    console.log('🔍 Migrating match analysis data...');
    const sourceMatchAnalysis = await sourceDb.movieMatchAnalysis.findMany({
      orderBy: { id: 'asc' },
    });

    let matchAnalysisCount = 0;
    for (const analysis of sourceMatchAnalysis) {
      const newMovieId = movieIdMap[analysis.movie_id];
      if (!newMovieId) {
        console.warn(`   ⚠️  Skipping match analysis ${analysis.id} - movie ${analysis.movie_id} not found`);
        continue;
      }

      await targetDb.movieMatchAnalysis.create({
        data: {
          movie_id: newMovieId,
          confidence_score: analysis.confidence_score,
          severity: analysis.severity,
          mismatches: analysis.mismatches,
          title_similarity: analysis.title_similarity,
          director_similarity: analysis.director_similarity,
          year_difference: analysis.year_difference,
          analysis_date: analysis.analysis_date,
        },
      });
      matchAnalysisCount++;
    }
    console.log(`✅ Migrated ${matchAnalysisCount} match analysis records\n`);

    // 7. Migrate BestPictureNominees
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

    // 8. Migrate OscarCategories
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

    // 9. Migrate OscarMovies
    console.log('🎥 Migrating Oscar movies...');
    const sourceOscarMovies = await sourceDb.oscarMovie.findMany({
      orderBy: { id: 'asc' },
    });

    for (const oscarMovie of sourceOscarMovies) {
      const newOscarMovie = await targetDb.oscarMovie.create({
        data: {
          tmdb_id: oscarMovie.tmdb_id,
          imdb_id: oscarMovie.imdb_id,
          title: oscarMovie.title,
        },
      });
      oscarMovieIdMap[oscarMovie.id] = newOscarMovie.id;
    }
    console.log(`✅ Migrated ${sourceOscarMovies.length} Oscar movies\n`);

    // 10. Migrate OscarNominations
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
    }
    console.log(`✅ Migrated ${oscarNominationCount} Oscar nominations\n`);

    // Summary
    console.log('🎉 Migration completed successfully!\n');
    console.log('📊 Final Summary:');
    console.log(`   Movies: ${await targetDb.movie.count()}`);
    console.log(`   User Movies: ${await targetDb.userMovie.count()}`);
    console.log(`   Tags: ${await targetDb.tag.count()}`);
    console.log(`   Oscar Data: ${await targetDb.oscarData.count()}`);
    console.log(`   Movie Tags: ${await targetDb.movieTag.count()}`);
    console.log(`   Match Analysis: ${await targetDb.movieMatchAnalysis.count()}`);
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

migrateData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
