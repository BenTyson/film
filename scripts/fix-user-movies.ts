/**
 * Script to re-associate movies with the correct production user
 * Run with: npx tsx scripts/fix-user-movies.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_EMAIL = 'ideaswithben@gmail.com';

async function main() {
  try {
    console.log('🔍 Finding user:', USER_EMAIL);

    // Find the production user
    const user = await prisma.users.findUnique({
      where: { email: USER_EMAIL }
    });

    if (!user) {
      console.error('❌ User not found:', USER_EMAIL);
      console.log('Available users:');
      const allUsers = await prisma.users.findMany({
        select: { id: true, email: true, clerk_id: true, role: true }
      });
      console.table(allUsers);
      return;
    }

    console.log('✅ Found user:', {
      id: user.id,
      email: user.email,
      clerk_id: user.clerk_id,
      role: user.role
    });

    // Find all approved movies
    const allMovies = await prisma.movies.findMany({
      where: {
        approval_status: 'approved'
      },
      select: {
        id: true,
        tmdb_id: true,
        title: true,
        user_movies: {
          where: {
            user_id: user.id
          }
        }
      }
    });

    console.log(`\n📊 Total approved movies in database: ${allMovies.length}`);

    // Filter movies that aren't linked to this user
    const moviesWithoutUser = allMovies.filter(movie => movie.user_movies.length === 0);

    console.log(`🔗 Movies not linked to ${USER_EMAIL}: ${moviesWithoutUser.length}`);

    if (moviesWithoutUser.length === 0) {
      console.log('\n✅ All movies are already linked to your user!');

      // Check if there are any existing user_movies for this user
      const existingUserMovies = await prisma.user_movies.count({
        where: { user_id: user.id }
      });
      console.log(`\n📝 You currently have ${existingUserMovies} movies in your collection.`);

      return;
    }

    console.log('\n🚀 Creating UserMovie records...');

    let created = 0;
    for (const movie of moviesWithoutUser) {
      try {
        await prisma.user_movies.create({
          data: {
            movie_id: movie.id,
            user_id: user.id,
            updated_at: new Date(),
            // Defaults: no rating, no watch date, not favorite
          }
        });
        created++;
        if (created % 100 === 0) {
          console.log(`  ✓ Created ${created}/${moviesWithoutUser.length} records...`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to create UserMovie for "${movie.title}":`, error);
      }
    }

    console.log(`\n✅ Successfully linked ${created} movies to your account!`);

    // Verify final count
    const finalCount = await prisma.user_movies.count({
      where: { user_id: user.id }
    });

    console.log(`\n📝 Your collection now has ${finalCount} movies total.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
