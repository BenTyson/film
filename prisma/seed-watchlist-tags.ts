import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding watchlist tags...');

  const watchlistTags = [
    { name: 'Morgan', color: '#8B5CF6', icon: 'user' },
    { name: 'Liam', color: '#3B82F6', icon: 'user' },
    { name: 'Epic', color: '#EF4444', icon: 'sword' },
    { name: 'Scary', color: '#F59E0B', icon: 'ghost' },
    { name: 'Indie', color: '#10B981', icon: 'palette' },
  ];

  for (const tag of watchlistTags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: { icon: tag.icon, color: tag.color },
      create: tag,
    });
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
