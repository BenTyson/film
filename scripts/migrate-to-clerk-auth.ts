import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToClerkAuth() {
  console.log('Starting migration to Clerk authentication...\n');

  try {
    // Step 1: Create a temporary user with id=1 to match existing data
    console.log('Step 1: Creating initial user (you!)...');

    const tempUser = await prisma.users.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        clerk_id: 'temp_will_be_replaced_on_first_login',
        email: 'your-email@example.com', // You'll update this when you first sign in with Clerk
        name: 'Ben',
        role: 'admin', // You get admin privileges
        updated_at: new Date()
      }
    });

    console.log(`✅ Created user: ${tempUser.name} (${tempUser.email})`);
    console.log(`   Role: ${tempUser.role}`);
    console.log(`   ID: ${tempUser.id}\n`);

    // Step 2: Check existing UserMovie records
    const userMovieCount = await prisma.user_movies.count({
      where: { user_id: 1 }
    });
    console.log(`Step 2: Found ${userMovieCount} user_movie records with user_id=1`);
    console.log('✅ These records now link to your user account\n');

    // Step 3: Check watchlist movies (all should already have user_id after schema update)
    const watchlistCount = await prisma.watchlist_movies.count({
      where: { user_id: 1 }
    });
    console.log(`Step 3: Found ${watchlistCount} watchlist movies linked to your account`);
    console.log('✅ Watchlist movies are properly linked\n');

    // Step 4: Summary
    console.log('📊 Migration Summary:');
    console.log(`   User created: ${tempUser.name} (ID: ${tempUser.id})`);
    console.log(`   Movies tracked: ${userMovieCount}`);
    console.log(`   Watchlist items: ${watchlistCount}`);
    console.log(`   Role: ${tempUser.role}\n`);

    console.log('✅ Migration completed successfully!\n');
    console.log('⚠️  IMPORTANT NEXT STEPS:');
    console.log('   1. Sign up with Clerk using your actual email');
    console.log('   2. The webhook will create a new user record');
    console.log('   3. Run the "reassign-data" script to transfer data to your Clerk user');
    console.log('   4. Delete the temporary user (ID: 1)\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateToClerkAuth()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
