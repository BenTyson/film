const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting Oscar integration with movie collection...');

  try {
    // Get all Oscar movies with their nominations
    const oscarMovies = await prisma.oscarMovie.findMany({
      where: {
        tmdb_id: { not: null }
      },
      include: {
        nominations: {
          include: {
            category: true
          }
        }
      }
    });

    console.log(`📊 Found ${oscarMovies.length} Oscar movies with TMDB IDs`);

    // Get all movies in the collection
    const collectionMovies = await prisma.movie.findMany({
      select: {
        id: true,
        tmdb_id: true,
        title: true
      }
    });

    const collectionByTmdbId = new Map(
      collectionMovies.map(m => [m.tmdb_id, m])
    );

    console.log(`📚 Found ${collectionMovies.length} movies in collection`);

    // Clear existing oscar_data entries
    console.log('🗑️  Clearing existing oscar_data entries...');
    await prisma.oscarData.deleteMany();

    let matches = 0;
    let oscarDataCreated = 0;
    const topNominated = [];

    // Process each Oscar movie
    for (const oscarMovie of oscarMovies) {
      if (!oscarMovie.tmdb_id) continue;

      const collectionMovie = collectionByTmdbId.get(oscarMovie.tmdb_id);

      if (collectionMovie) {
        matches++;

        // Group nominations by category and year
        const uniqueNominations = new Map();

        for (const nom of oscarMovie.nominations) {
          const key = `${nom.ceremony_year}-${nom.category.name}`;
          if (!uniqueNominations.has(key)) {
            uniqueNominations.set(key, {
              ceremony_year: nom.ceremony_year,
              category: nom.category.name,
              is_winner: nom.is_winner
            });
          }
        }

        // Create OscarData entries
        for (const [key, data] of uniqueNominations) {
          try {
            await prisma.oscarData.create({
              data: {
                movie_id: collectionMovie.id,
                ceremony_year: data.ceremony_year,
                category: data.category,
                is_winner: data.is_winner
              }
            });
            oscarDataCreated++;
          } catch (error) {
            console.error(`Error creating OscarData for ${collectionMovie.title}:`, error.message);
          }
        }

        const wins = oscarMovie.nominations.filter(n => n.is_winner).length;
        topNominated.push({
          title: collectionMovie.title,
          nominations: oscarMovie.nominations.length,
          wins: wins
        });

        if (matches % 50 === 0) {
          console.log(`   Processed ${matches} matches...`);
        }
      }
    }

    // Sort by nomination count
    topNominated.sort((a, b) => b.nominations - a.nominations);

    console.log('\n✅ Oscar integration completed!');
    console.log(`   Matches found: ${matches}/${oscarMovies.length} (${(matches/oscarMovies.length*100).toFixed(1)}%)`);
    console.log(`   Oscar data entries created: ${oscarDataCreated}`);
    console.log(`   Movies with wins: ${topNominated.filter(m => m.wins > 0).length}`);

    console.log('\n🏆 Top 10 nominated movies in your collection:');
    topNominated.slice(0, 10).forEach((movie, i) => {
      console.log(`   ${i + 1}. ${movie.title} (${movie.nominations} nominations, ${movie.wins} wins)`);
    });

  } catch (error) {
    console.error('❌ Error during integration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();