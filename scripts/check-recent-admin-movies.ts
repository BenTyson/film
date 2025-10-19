import { prisma } from '../src/lib/prisma';

async function checkRecentAdminMovies() {
  try {
    // Find the admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'ideaswithben@gmail.com' }
    });

    if (!adminUser) {
      console.log('Admin user not found');
      return;
    }

    console.log(`Admin user ID: ${adminUser.id}\n`);

    // Get recent movies added to admin account (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUserMovies = await prisma.userMovie.findMany({
      where: {
        user_id: adminUser.id,
        created_at: {
          gte: sevenDaysAgo
        }
      },
      include: {
        movie: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`Found ${recentUserMovies.length} movies added to admin account in last 7 days:\n`);

    if (recentUserMovies.length === 0) {
      console.log('No recent movies found.');
      return;
    }

    recentUserMovies.forEach((um, index) => {
      console.log(`${index + 1}. ${um.movie.title} (${um.movie.release_date?.getFullYear() || 'N/A'})`);
      console.log(`   - TMDB ID: ${um.movie.tmdb_id}`);
      console.log(`   - UserMovie ID: ${um.id}`);
      console.log(`   - Added: ${um.created_at.toLocaleString()}`);
      console.log(`   - Rating: ${um.personal_rating || 'None'}`);
      console.log(`   - Notes: ${um.notes || 'None'}`);
      console.log(`   - Watched with: ${um.buddy_watched_with || 'None'}`);
      console.log('');
    });

    // Check if there are other users in the system
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        created_at: true
      }
    });

    console.log('\n=== All Users in System ===');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (ID: ${user.id}, Created: ${user.created_at.toLocaleDateString()})`);
    });

  } catch (error) {
    console.error('Error checking movies:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentAdminMovies();
