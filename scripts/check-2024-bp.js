const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBestPicture2024() {
  console.log('Checking 2024 Best Picture nominations:\n');

  const nominations = await prisma.oscarNomination.findMany({
    where: {
      ceremony_year: 2024,
      category: {
        name: 'Best Picture'
      }
    },
    include: {
      movie: true,
      category: true
    },
    orderBy: {
      is_winner: 'desc'
    }
  });

  nominations.forEach(nom => {
    const status = nom.is_winner ? '🏆 WINNER' : '  Nominee';
    const title = nom.movie?.title || 'Unknown';
    const tmdbId = nom.movie?.tmdb_id || 'N/A';
    console.log(`${status}: ${title} (TMDB: ${tmdbId})`);
  });

  console.log(`\nTotal: ${nominations.length} nominations`);

  await prisma.$disconnect();
}

checkBestPicture2024().catch(e => {
  console.error(e);
  process.exit(1);
});
