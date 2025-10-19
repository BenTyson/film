import { prisma } from '../src/lib/prisma';

async function checkTags() {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: {
            movie_tags: true,
            watchlist_tags: true
          }
        }
      }
    });

    console.log(`Found ${tags.length} tags:`);
    tags.forEach(tag => {
      console.log(`  - ${tag.name} (ID: ${tag.id}, Color: ${tag.color}, Used: ${tag._count.movie_tags + tag._count.watchlist_tags} times)`);
    });

    // Check for duplicate names
    const nameCount: Record<string, number> = {};
    tags.forEach(tag => {
      nameCount[tag.name] = (nameCount[tag.name] || 0) + 1;
    });

    const duplicates = Object.entries(nameCount).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('\nDuplicate tag names found:');
      duplicates.forEach(([name, count]) => {
        console.log(`  - "${name}" appears ${count} times`);
      });
    } else {
      console.log('\nNo duplicate tag names found.');
    }

  } catch (error) {
    console.error('Error checking tags:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTags();
