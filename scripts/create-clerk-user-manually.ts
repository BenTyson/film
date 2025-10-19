import { PrismaClient } from '@prisma/client';
import { clerkClient } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

/**
 * Manually create your Clerk user in the database
 * Use this if the webhook wasn't configured when you signed up
 */
async function createClerkUserManually() {
  console.log('Fetching your Clerk user info...\n');

  try {
    // Get all Clerk users
    const client = await clerkClient();
    const clerkUsers = await client.users.getUserList();

    if (clerkUsers.data.length === 0) {
      console.log('❌ No Clerk users found. Are you signed in?');
      return;
    }

    console.log(`Found ${clerkUsers.data.length} Clerk user(s):\n`);

    for (const clerkUser of clerkUsers.data) {
      const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;
      const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null;

      console.log(`Clerk User:`);
      console.log(`  - Name: ${name || 'Not provided'}`);
      console.log(`  - Email: ${email}`);
      console.log(`  - Clerk ID: ${clerkUser.id}\n`);

      // Check if already exists in our database
      const existingUser = await prisma.user.findUnique({
        where: { clerk_id: clerkUser.id }
      });

      if (existingUser) {
        console.log(`✅ User already exists in database (ID: ${existingUser.id})\n`);
        continue;
      }

      // Create in our database
      const newUser = await prisma.user.create({
        data: {
          clerk_id: clerkUser.id,
          email: email || 'unknown@example.com',
          name: name,
          role: 'admin', // Make you an admin
        }
      });

      console.log(`✅ Created user in database:`);
      console.log(`  - Database ID: ${newUser.id}`);
      console.log(`  - Role: ${newUser.role}\n`);
    }

    console.log('✅ Done! Now run the transfer script:');
    console.log('   npx tsx scripts/transfer-data-to-clerk-user.ts\n');

  } catch (error) {
    console.error('❌ Failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createClerkUserManually()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
