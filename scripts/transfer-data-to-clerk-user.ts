import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Transfer all data from temporary user (ID: 1) to your real Clerk user
 * Run this AFTER you've signed up with Clerk
 */
async function transferDataToClerkUser() {
  console.log('Starting data transfer to your Clerk account...\n');

  try {
    // Step 1: Find the temporary user
    const tempUser = await prisma.users.findUnique({
      where: { id: 1 },
    });

    if (!tempUser) {
      console.log('❌ Temporary user (ID: 1) not found. Data may have already been transferred.');
      return;
    }

    console.log(`Found temporary user: ${tempUser.name} (${tempUser.email})`);
    console.log(`Clerk ID: ${tempUser.clerk_id}\n`);

    // Step 2: Find your real Clerk user (the one that's NOT the temp user)
    const realUsers = await prisma.users.findMany({
      where: {
        id: { not: 1 },
        clerk_id: { not: 'temp_will_be_replaced_on_first_login' }
      }
    });

    if (realUsers.length === 0) {
      console.log('❌ No real Clerk user found. Please sign up first, then run this script.');
      return;
    }

    if (realUsers.length > 1) {
      console.log('⚠️  Multiple users found. Please specify which one is yours:\n');
      realUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || 'Unknown'} (${user.email}) - Role: ${user.role}`);
      });
      console.log('\nEdit this script and add the email in the WHERE clause.');
      return;
    }

    const realUser = realUsers[0];
    console.log(`Found your Clerk user: ${realUser.name} (${realUser.email})`);
    console.log(`Role: ${realUser.role}\n`);

    // Step 3: Count what we're transferring
    const userMovieCount = await prisma.user_movies.count({
      where: { user_id: 1 }
    });

    const watchlistCount = await prisma.watchlist_movies.count({
      where: { user_id: 1 }
    });

    console.log(`📊 Data to transfer:`);
    console.log(`   - User Movies: ${userMovieCount}`);
    console.log(`   - Watchlist Movies: ${watchlistCount}\n`);

    // Step 4: Transfer UserMovie records
    console.log('Transferring user movies...');
    const transferredMovies = await prisma.user_movies.updateMany({
      where: { user_id: 1 },
      data: { user_id: realUser.id }
    });
    console.log(`✅ Transferred ${transferredMovies.count} user movies\n`);

    // Step 5: Transfer Watchlist records
    console.log('Transferring watchlist movies...');
    const transferredWatchlist = await prisma.watchlist_movies.updateMany({
      where: { user_id: 1 },
      data: { user_id: realUser.id }
    });
    console.log(`✅ Transferred ${transferredWatchlist.count} watchlist movies\n`);

    // Step 6: Promote to admin if not already
    if (realUser.role !== 'admin') {
      console.log('Promoting you to admin...');
      await prisma.users.update({
        where: { id: realUser.id },
        data: { role: 'admin' }
      });
      console.log(`✅ Promoted to admin\n`);
    } else {
      console.log(`✅ Already an admin\n`);
    }

    // Step 7: Delete temporary user
    console.log('Deleting temporary user...');
    await prisma.users.delete({
      where: { id: 1 }
    });
    console.log(`✅ Deleted temporary user\n`);

    // Step 8: Summary
    console.log('🎉 Data transfer complete!\n');
    console.log(`📊 Final Summary:`);
    console.log(`   Your User: ${realUser.name} (${realUser.email})`);
    console.log(`   Role: admin`);
    console.log(`   Movies: ${transferredMovies.count}`);
    console.log(`   Watchlist: ${transferredWatchlist.count}`);
    console.log(`\n✅ You can now log in and see all your movies!`);

  } catch (error) {
    console.error('❌ Transfer failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

transferDataToClerkUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
