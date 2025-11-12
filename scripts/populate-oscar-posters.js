/**
 * Populate Oscar Movies with Poster Paths from TMDB
 *
 * Fetches poster_path from TMDB for all Oscar movies that have a tmdb_id but no poster_path
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RATE_LIMIT_DELAY = 250; // ms between requests
const BATCH_SIZE = 50;
const LOG_FILE = path.join(__dirname, 'oscar-posters-populate.log');

// Helper to write to log file
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
  console.log(message);
}

// Fetch movie details from TMDB
async function getMovieDetails(tmdbId) {
  const url = `${TMDB_BASE_URL}/movie/${tmdbId}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${TMDB_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  return await response.json();
}

// Process a single movie
async function processMovie(movie, index, total) {
  try {
    const movieDetails = await getMovieDetails(movie.tmdb_id);

    if (movieDetails.poster_path) {
      await prisma.oscarMovie.update({
        where: { id: movie.id },
        data: { poster_path: movieDetails.poster_path }
      });

      console.log(`[${index}/${total}] ✅ ${movie.title} - ${movieDetails.poster_path}`);
      return { success: true, movie: movie.title };
    } else {
      console.log(`[${index}/${total}] ⚠️  ${movie.title} - No poster available`);
      return { success: true, movie: movie.title, noPoster: true };
    }
  } catch (error) {
    console.log(`[${index}/${total}] ❌ ${movie.title} - ${error.message}`);
    log(`FAILED: ${movie.title} (TMDB ID: ${movie.tmdb_id}) - ${error.message}`);
    return { success: false, movie: movie.title, error: error.message };
  }
}

async function main() {
  console.log('=== Populating Oscar Movies with Poster Paths ===\n');
  log('=== Starting Oscar Poster Population ===');
  log(`Started at: ${new Date().toISOString()}`);

  // Get all Oscar movies with TMDB IDs but no poster_path
  const movies = await prisma.oscarMovie.findMany({
    where: {
      tmdb_id: { not: null },
      poster_path: null
    },
    select: {
      id: true,
      tmdb_id: true,
      title: true
    }
  });

  console.log(`Found ${movies.length} movies to process\n`);
  log(`Movies to process: ${movies.length}`);

  const results = {
    total: movies.length,
    successful: 0,
    failed: 0,
    noPoster: 0,
    failures: []
  };

  // Process in batches
  const totalBatches = Math.ceil(movies.length / BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = batchIndex * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, movies.length);
    const batch = movies.slice(batchStart, batchEnd);

    console.log(`\n--- Batch ${batchIndex + 1}/${totalBatches} (${batchStart + 1}-${batchEnd}/${movies.length}) ---`);

    for (let i = 0; i < batch.length; i++) {
      const movie = batch[i];
      const globalIndex = batchStart + i + 1;

      const result = await processMovie(movie, globalIndex, movies.length);

      if (result.success) {
        if (result.noPoster) {
          results.noPoster++;
        } else {
          results.successful++;
        }
      } else {
        results.failed++;
        results.failures.push({
          title: movie.title,
          tmdb_id: movie.tmdb_id,
          error: result.error
        });
      }

      // Rate limiting
      if (i < batch.length - 1 || batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }

    console.log(`Batch complete: ${batch.length} processed`);
  }

  // Final summary
  console.log('\n=== FINAL SUMMARY ===');
  console.log(`Total processed: ${results.total}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`No poster available: ${results.noPoster}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success rate: ${((results.successful / results.total) * 100).toFixed(1)}%`);

  log('=== FINAL SUMMARY ===');
  log(`Total: ${results.total}, Successful: ${results.successful}, No poster: ${results.noPoster}, Failed: ${results.failed}`);
  log(`Completed at: ${new Date().toISOString()}`);

  // Export failures to CSV if any
  if (results.failures.length > 0) {
    const csvPath = path.join(__dirname, 'oscar-poster-failures.csv');
    const csvContent = 'Title,TMDB ID,Error\n' +
      results.failures.map(f => `"${f.title}",${f.tmdb_id},"${f.error}"`).join('\n');
    fs.writeFileSync(csvPath, csvContent);
    console.log(`\nFailures exported to: ${csvPath}`);
  }

  console.log(`\nLog saved to: ${LOG_FILE}`);
}

main()
  .catch(error => {
    console.error('Fatal error:', error);
    log(`FATAL ERROR: ${error.message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
