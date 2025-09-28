const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importOscarData() {
  try {
    console.log('Starting Oscar 2024-2025 data import...');

    // Read the JSON file
    const jsonPath = path.join(__dirname, '../src/data/oscar-2024-2025.json');
    const oscarData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const nomination of oscarData) {
      try {
        const movieData = nomination.movies[0];

        // Find the movie by TMDB ID
        let movie = await prisma.movie.findFirst({
          where: { tmdb_id: movieData.tmdb_id }
        });

        if (!movie) {
          console.log(`Movie not found: ${movieData.title} (TMDB: ${movieData.tmdb_id})`);
          console.log('Skipping - add this movie to your collection first');
          skipped++;
          continue;
        }

        // Check if this Oscar record already exists
        const existingOscar = await prisma.oscarData.findFirst({
          where: {
            movie_id: movie.id,
            ceremony_year: parseInt(nomination.year),
            category: nomination.category
          }
        });

        if (existingOscar) {
          console.log(`Oscar data already exists for ${movie.title} (${nomination.year})`);
          skipped++;
          continue;
        }

        // Create the Oscar data record
        await prisma.oscarData.create({
          data: {
            movie_id: movie.id,
            ceremony_year: parseInt(nomination.year),
            category: nomination.category,
            is_winner: nomination.won,
            nominee_name: null,
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        console.log(`✓ Imported: ${movie.title} - ${nomination.category} (${nomination.year}) - ${nomination.won ? 'WON' : 'NOMINATED'}`);
        imported++;

      } catch (error) {
        console.error(`Error processing ${nomination.movies[0]?.title}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total processed: ${oscarData.length}`);

  } catch (error) {
    console.error('Fatal error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importOscarData();