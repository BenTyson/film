import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding watchlist tags...');

  const watchlistTags = [
    { name: 'Morgan', color: '#8B5CF6', icon: 'user' },
    { name: 'Epic', color: '#EF4444', icon: 'sword' },
    { name: 'Indie', color: '#10B981', icon: 'palette' },
    { name: 'Funny', color: '#FBBF24', icon: 'smile' },
    { name: 'Drama', color: '#8B5CF6', icon: 'theater' },
    { name: 'Classic', color: '#6B7280', icon: 'film' },
  ];

  for (const tag of watchlistTags) {
    // For global tags (user_id = null), we need to check if they exist first
    const existingTag = await prisma.tags.findFirst({
      where: {
        name: tag.name,
        user_id: null
      }
    });

    if (existingTag) {
      await prisma.tags.update({
        where: { id: existingTag.id },
        data: { icon: tag.icon, color: tag.color }
      });
    } else {
      await prisma.tags.create({
        data: {
          ...tag,
          user_id: null
        }
      });
    }
    console.log(`✓ Created/verified tag: ${tag.name}`);
  }

  console.log('\nWatchlist tags seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding watchlist tags:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
