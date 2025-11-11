const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCeremonyYears() {
  console.log('🔧 Fixing ceremony years to match actual Oscar ceremony dates...\n');

  // Get current year range
  const currentRange = await prisma.oscarNomination.aggregate({
    _min: { ceremony_year: true },
    _max: { ceremony_year: true }
  });

  console.log(`Current range: ${currentRange._min.ceremony_year} - ${currentRange._max.ceremony_year}`);
  console.log('New range will be: ' + (currentRange._min.ceremony_year + 1) + ' - ' + (currentRange._max.ceremony_year + 1));
  console.log('\nExamples:');
  console.log('  • Everything Everywhere All at Once: 2022 → 2023 (March 2023 ceremony)');
  console.log('  • Oppenheimer: 2023 → 2024 (March 2024 ceremony)');
  console.log('  • Wings: 1927 → 1928 (1st Academy Awards ceremony)\n');

  // Update all oscar_nominations
  console.log('Updating oscar_nominations table...');
  const nominationsResult = await prisma.$executeRaw`
    UPDATE oscar_nominations
    SET ceremony_year = ceremony_year + 1
  `;
  console.log(`✅ Updated ${nominationsResult} nomination records`);

  // Verify the changes
  const verification = await prisma.oscarNomination.findMany({
    where: {
      category: {
        name: 'Best Picture'
      },
      is_winner: true,
      ceremony_year: {
        in: [2023, 2024]
      }
    },
    include: {
      movie: true
    },
    orderBy: {
      ceremony_year: 'asc'
    }
  });

  console.log('\n✅ Verification - Recent Best Picture Winners:');
  verification.forEach(v => {
    console.log(`  ${v.ceremony_year}: ${v.movie?.title}`);
  });

  console.log('\n🎉 Ceremony years fixed successfully!');
  console.log('Note: Remember to update import-oscars.js to add +1 for future imports.');

  await prisma.$disconnect();
}

fixCeremonyYears().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
