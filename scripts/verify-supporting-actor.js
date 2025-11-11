const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyBestSupportingActor() {
  console.log('Verifying Best Supporting Actor import...\n');

  // Check recent winners
  const recentWinners = await prisma.oscarNomination.findMany({
    where: {
      category: {
        name: 'Best Supporting Actor'
      },
      is_winner: true,
      ceremony_year: {
        gte: 2020
      }
    },
    include: {
      movie: true
    },
    orderBy: {
      ceremony_year: 'desc'
    }
  });

  console.log('Recent Best Supporting Actor Winners:');
  recentWinners.forEach(w => {
    console.log(`  ${w.ceremony_year}: ${w.nominee_name} - "${w.movie?.title}"`);
  });

  // Count total
  const totalCount = await prisma.oscarNomination.count({
    where: {
      category: {
        name: 'Best Supporting Actor'
      }
    }
  });

  console.log(`\nTotal Best Supporting Actor nominations: ${totalCount}`);

  // Check a classic winner
  const classicWinner = await prisma.oscarNomination.findFirst({
    where: {
      category: {
        name: 'Best Supporting Actor'
      },
      nominee_name: {
        contains: 'Heath Ledger'
      }
    },
    include: {
      movie: true
    }
  });

  if (classicWinner) {
    console.log('\nClassic Example:');
    console.log(`  ${classicWinner.ceremony_year}: ${classicWinner.nominee_name}`);
    console.log(`  Movie: ${classicWinner.movie?.title}`);
    console.log(`  Winner: ${classicWinner.is_winner ? 'Yes' : 'No'}`);
    console.log('  Expected: 2009 ceremony for The Dark Knight');
  }

  await prisma.$disconnect();
}

verifyBestSupportingActor().catch(e => {
  console.error(e);
  process.exit(1);
});
