import { prisma } from '../src/lib/prisma';

async function migrateBuddiesToArray() {
  console.log('Starting migration of buddy_watched_with to JSON arrays...\n');

  try {
    // Get all user movies with buddy_watched_with values
    const userMovies = await prisma.$queryRaw<Array<{
      id: number;
      buddy_watched_with: string | null;
    }>>`
      SELECT id, buddy_watched_with
      FROM user_movies
      WHERE buddy_watched_with IS NOT NULL
    `;

    console.log(`Found ${userMovies.length} user movies with buddy data\n`);

    let converted = 0;
    for (const um of userMovies) {
      if (um.buddy_watched_with && typeof um.buddy_watched_with === 'string') {
        // Convert single string to array
        const buddyArray = [um.buddy_watched_with];

        await prisma.$executeRaw`
          UPDATE user_movies
          SET buddy_watched_with = ${JSON.stringify(buddyArray)}::jsonb
          WHERE id = ${um.id}
        `;

        console.log(`✓ Converted ID ${um.id}: "${um.buddy_watched_with}" → ${JSON.stringify(buddyArray)}`);
        converted++;
      }
    }

    console.log(`\n✅ Migration complete! Converted ${converted} records.`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateBuddiesToArray();
