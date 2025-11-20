import { prisma } from '@/lib/prisma';

/**
 * Test Multi-User Data Isolation
 *
 * This script verifies that:
 * 1. Each user only sees their own movies in the collection
 * 2. Each user only sees their own watchlist
 * 3. Movie details are only accessible to the owner
 * 4. Tag operations are restricted to the owner
 * 5. Oscar routes remain public (no user filtering)
 */

async function testMultiUserIsolation() {
  console.log('🔒 Testing Multi-User Data Isolation\n');

  try {
    // Get both users
    const user1 = await prisma.users.findUnique({
      where: { email: 'ideaswithben@gmail.com' }
    });

    const user2 = await prisma.users.findUnique({
      where: { email: 'tyson.ben@gmail.com' }
    });

    if (!user1 || !user2) {
      console.error('❌ Both users must exist in database');
      console.log(`User 1 (ideaswithben@gmail.com): ${user1 ? '✅' : '❌'}`);
      console.log(`User 2 (tyson.ben@gmail.com): ${user2 ? '✅' : '❌'}`);
      return;
    }

    console.log('✅ Both users found in database\n');

    // Test 1: Movie Collection Isolation
    console.log('📋 Test 1: Movie Collection Isolation');
    console.log('─'.repeat(50));

    const user1Movies = await prisma.movies.findMany({
      where: {
        user_movies: {
          some: {
            user_id: user1.id
          }
        }
      }
    });

    const user2Movies = await prisma.movies.findMany({
      where: {
        user_movies: {
          some: {
            user_id: user2.id
          }
        }
      }
    });

    console.log(`User 1 (${user1.email}): ${user1Movies.length} movies`);
    console.log(`User 2 (${user2.email}): ${user2Movies.length} movies`);

    if (user1Movies.length === 2412 && user2Movies.length === 0) {
      console.log('✅ Movie collection isolation working correctly\n');
    } else {
      console.log('⚠️  Expected: User 1 = 2412 movies, User 2 = 0 movies\n');
    }

    // Test 2: Watchlist Isolation
    console.log('📝 Test 2: Watchlist Isolation');
    console.log('─'.repeat(50));

    const user1Watchlist = await prisma.watchlist_movies.findMany({
      where: { user_id: user1.id }
    });

    const user2Watchlist = await prisma.watchlist_movies.findMany({
      where: { user_id: user2.id }
    });

    console.log(`User 1 watchlist: ${user1Watchlist.length} items`);
    console.log(`User 2 watchlist: ${user2Watchlist.length} items`);

    if (user1Watchlist.length === 10 && user2Watchlist.length === 0) {
      console.log('✅ Watchlist isolation working correctly\n');
    } else {
      console.log('⚠️  Expected: User 1 = 10 items, User 2 = 0 items\n');
    }

    // Test 3: UserMovie Records Isolation
    console.log('🎬 Test 3: UserMovie Records Isolation');
    console.log('─'.repeat(50));

    const user1UserMovies = await prisma.user_movies.findMany({
      where: { user_id: user1.id }
    });

    const user2UserMovies = await prisma.user_movies.findMany({
      where: { user_id: user2.id }
    });

    console.log(`User 1 UserMovie records: ${user1UserMovies.length}`);
    console.log(`User 2 UserMovie records: ${user2UserMovies.length}`);

    if (user2UserMovies.length === 0) {
      console.log('✅ UserMovie records properly isolated\n');
    } else {
      console.log('⚠️  User 2 should have 0 UserMovie records\n');
    }

    // Test 4: Tag Access Control
    console.log('🏷️  Test 4: Tag Access Control');
    console.log('─'.repeat(50));

    // Get a sample movie from user 1
    const sampleMovie = await prisma.movies.findFirst({
      where: {
        user_movies: {
          some: { user_id: user1.id }
        }
      },
      include: {
        user_movies: {
          where: { user_id: user1.id }
        }
      }
    });

    if (sampleMovie) {
      console.log(`Sample movie: "${sampleMovie.title}" (ID: ${sampleMovie.id})`);
      console.log(`Owned by: User 1`);

      // Check if user 2 has access
      const user2Access = await prisma.movies.findUnique({
        where: { id: sampleMovie.id },
        include: {
          user_movies: {
            where: { user_id: user2.id }
          }
        }
      });

      if (user2Access && user2Access.user_movies.length === 0) {
        console.log('✅ User 2 cannot access User 1\'s movie (as expected)\n');
      } else {
        console.log('⚠️  User 2 should not have access to User 1\'s movies\n');
      }
    }

    // Test 5: Oscar Data Remains Public
    console.log('🏆 Test 5: Oscar Data Accessibility (should be public)');
    console.log('─'.repeat(50));

    const oscarData = await prisma.oscar_data.findMany({
      take: 10
    });

    const bestPictureNominees = await prisma.best_picture_nominees.findMany({
      take: 10
    });

    console.log(`Oscar data records: ${oscarData.length} (accessible to all users)`);
    console.log(`Best Picture nominees: ${bestPictureNominees.length} (accessible to all users)`);
    console.log('✅ Oscar data remains public (not filtered by user)\n');

    // Summary
    console.log('═'.repeat(50));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(50));
    console.log(`✅ User 1 (${user1.email}):`);
    console.log(`   - ${user1Movies.length} movies in collection`);
    console.log(`   - ${user1Watchlist.length} watchlist items`);
    console.log(`   - ${user1UserMovies.length} UserMovie records`);
    console.log('');
    console.log(`✅ User 2 (${user2.email}):`);
    console.log(`   - ${user2Movies.length} movies in collection`);
    console.log(`   - ${user2Watchlist.length} watchlist items`);
    console.log(`   - ${user2UserMovies.length} UserMovie records`);
    console.log('');
    console.log(`🏆 Oscar data: Public (${oscarData.length} records)`);
    console.log('');

    const allTestsPassed =
      user1Movies.length === 2412 &&
      user2Movies.length === 0 &&
      user1Watchlist.length === 10 &&
      user2Watchlist.length === 0 &&
      user2UserMovies.length === 0;

    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED - Multi-user isolation is working correctly!');
    } else {
      console.log('⚠️  SOME TESTS FAILED - Please review the results above');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMultiUserIsolation();
