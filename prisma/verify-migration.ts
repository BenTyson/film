import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function verify() {
  console.log('📊 Verifying Railway PostgreSQL database...\n');

  try {
    const movieCount = await db.movie.count();
    const userMovieCount = await db.userMovie.count();
    const tagCount = await db.tag.count();
    const oscarDataCount = await db.oscarData.count();
    const movieTagCount = await db.movieTag.count();
    const matchAnalysisCount = await db.movieMatchAnalysis.count();
    const bestPictureCount = await db.bestPictureNominee.count();
    const oscarCategoryCount = await db.oscarCategory.count();
    const oscarMovieCount = await db.oscarMovie.count();
    const oscarNominationCount = await db.oscarNomination.count();

    console.log('Current counts in PostgreSQL:');
    console.log(`   Movies: ${movieCount}`);
    console.log(`   User Movies: ${userMovieCount}`);
    console.log(`   Tags: ${tagCount}`);
    console.log(`   Oscar Data: ${oscarDataCount}`);
    console.log(`   Movie Tags: ${movieTagCount}`);
    console.log(`   Match Analysis: ${matchAnalysisCount}`);
    console.log(`   Best Picture Nominees: ${bestPictureCount}`);
    console.log(`   Oscar Categories: ${oscarCategoryCount}`);
    console.log(`   Oscar Movies: ${oscarMovieCount}`);
    console.log(`   Oscar Nominations: ${oscarNominationCount}`);

    console.log('\nExpected counts from SQLite:');
    console.log('   Movies: 2436');
    console.log('   User Movies: 2401');
    console.log('   Tags: 1');
    console.log('   Oscar Data: 635');
    console.log('   Movie Tags: 51');

    if (movieCount === 2436 && userMovieCount === 2401) {
      console.log('\n✅ Migration appears complete!');
    } else {
      console.log('\n⚠️  Migration incomplete - may need to resume');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

verify();
