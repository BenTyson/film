const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyPattern() {
  console.log('🔍 Checking ceremony year pattern across different decades...\n');

  // Test years: spread across the full Oscar history
  const testYears = [1927, 1940, 1960, 1980, 2000, 2010, 2022];

  // Known actual ceremony information
  const knownCeremonies = {
    1927: { actualCeremony: 1929, filmYear: 1927, ceremony: '1st Academy Awards (May 1929)' },
    1940: { actualCeremony: 1941, filmYear: 1940, ceremony: '13th Academy Awards (Feb 1941)' },
    1960: { actualCeremony: 1961, filmYear: 1960, ceremony: '33rd Academy Awards (Apr 1961)' },
    1980: { actualCeremony: 1981, filmYear: 1980, ceremony: '53rd Academy Awards (Mar 1981)' },
    2000: { actualCeremony: 2001, filmYear: 2000, ceremony: '73rd Academy Awards (Mar 2001)' },
    2010: { actualCeremony: 2011, filmYear: 2010, ceremony: '83rd Academy Awards (Feb 2011)' },
    2022: { actualCeremony: 2023, filmYear: 2022, ceremony: '95th Academy Awards (Mar 2023)' }
  };

  for (const year of testYears) {
    const winner = await prisma.oscarNomination.findFirst({
      where: {
        ceremony_year: year,
        is_winner: true,
        category: {
          name: 'Best Picture'
        }
      },
      include: {
        movie: true
      }
    });

    if (winner) {
      const known = knownCeremonies[year];
      const difference = known ? known.actualCeremony - year : '?';

      console.log(`Year ${year} in DB:`);
      console.log(`  Winner: ${winner.movie?.title}`);
      if (known) {
        console.log(`  Expected ceremony: ${known.ceremony}`);
        console.log(`  Difference: ${difference} year${difference !== 1 ? 's' : ''}`);
        console.log(`  ${difference === 1 ? '✅' : '⚠️'} ${difference === 1 ? 'Consistent +1 pattern' : 'DIFFERENT PATTERN!'}`);
      }
      console.log('');
    } else {
      console.log(`Year ${year}: No Best Picture winner found in DB\n`);
    }
  }

  // Also check the very first ceremony (special case)
  console.log('Special case check:');
  const firstCeremony = await prisma.oscarNomination.findFirst({
    where: {
      category: {
        name: 'Best Picture'
      },
      is_winner: true
    },
    include: {
      movie: true
    },
    orderBy: {
      ceremony_year: 'asc'
    }
  });

  if (firstCeremony) {
    console.log(`First ceremony in DB: ${firstCeremony.ceremony_year}`);
    console.log(`Winner: ${firstCeremony.movie?.title}`);
    console.log(`Expected: 1928 or 1929 (1st Academy Awards, May 1929)`);
    console.log(`Note: First ceremony honored 1927-1928 films\n`);
  }

  await prisma.$disconnect();
}

verifyPattern().catch(e => {
  console.error(e);
  process.exit(1);
});
