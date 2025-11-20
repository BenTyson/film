#!/usr/bin/env npx tsx

import { prisma } from '../src/lib/prisma';

async function checkImportData() {
  console.log('🔍 Checking imported data...');

  try {
    // Get counts
    const counts = await Promise.all([
      prisma.movies.count(),
      prisma.movie_match_analysis.count(),
      prisma.user_movies.count(),
      prisma.movies.count({ where: { approval_status: 'pending' } }),
      prisma.movies.count({ where: { csv_row_number: { not: null } } })
    ]);

    console.log('📊 Database counts:');
    console.log(`- Total movies: ${counts[0]}`);
    console.log(`- Match analyses: ${counts[1]}`);
    console.log(`- User movies: ${counts[2]}`);
    console.log(`- Pending movies: ${counts[3]}`);
    console.log(`- Movies with CSV data: ${counts[4]}`);

    // Get sample data
    if (counts[0] > 0) {
      console.log('\n🎬 Sample movies:');
      const sampleMovies = await prisma.movies.findMany({
        take: 3,
        include: {
          movie_match_analysis: true
        },
        orderBy: { csv_row_number: 'asc' }
      });

      sampleMovies.forEach((movie, i) => {
        console.log(`${i + 1}. ${movie.title} (CSV: ${movie.csv_title})`);
        console.log(`   - Approval: ${movie.approval_status}`);
        console.log(`   - CSV Row: ${movie.csv_row_number}`);
        console.log(`   - Analysis: ${movie.movie_match_analysis ? 'Yes' : 'No'}`);
        if (movie.movie_match_analysis) {
          console.log(`   - Confidence: ${movie.movie_match_analysis.confidence_score}%`);
        }
        console.log('');
      });
    }

    // Test the corrected query from pending-approval API
    console.log('🧪 Testing pending-approval query (v1 - simple)...');
    const where1 = {
      approval_status: 'pending'
    };

    console.log('🧪 Testing pending-approval query (v2 - with OR)...');
    const where2 = {
      OR: [
        { approval_status: 'pending' },
        { approval_status: '' }
      ]
    };

    // Test simple query first
    try {
      const pendingMovies1 = await prisma.movies.findMany({
        where: where1,
        take: 2
      });
      console.log(`✅ Simple query successful! Found ${pendingMovies1.length} pending movies`);
    } catch (queryError) {
      console.error('❌ Simple query failed:', queryError);
    }

    // Test OR query
    try {
      const pendingMovies2 = await prisma.movies.findMany({
        where: where2,
        take: 2
      });
      console.log(`✅ OR query successful! Found ${pendingMovies2.length} pending movies`);
    } catch (queryError) {
      console.error('❌ OR query failed:', queryError);
    }

    // Test full query with includes
    try {
      const pendingMovies = await prisma.movies.findMany({
        where: where1, // Use simple query for now
        take: 2,
        include: {
          movie_match_analysis: true,
          user_movies: true,
          oscar_data: true,
          movie_tags: {
            include: {
              tags: true
            }
          }
        }
      });

      console.log(`✅ Full query successful! Found ${pendingMovies.length} pending movies`);

      if (pendingMovies.length > 0) {
        const movie = pendingMovies[0];
        console.log('Sample pending movie data:');
        console.log(`- ID: ${movie.id}`);
        console.log(`- Title: ${movie.title}`);
        console.log(`- CSV Title: ${movie.csv_title}`);
        console.log(`- Approval Status: ${movie.approval_status}`);
        console.log(`- Has Analysis: ${movie.movie_match_analysis ? 'Yes' : 'No'}`);
        console.log(`- Has User Data: ${movie.user_movies.length > 0 ? 'Yes' : 'No'}`);
      }

    } catch (queryError) {
      console.error('❌ Full query failed:', queryError);
    }

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  checkImportData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { checkImportData };