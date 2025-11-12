/**
 * Full script to populate all Oscar nominations with TMDB person data
 * Processes actors, actresses, and directors across all ceremony years
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Categories that have person nominees
const PERSON_CATEGORIES = [
  'Best Actor',
  'Best Actress',
  'Best Supporting Actor',
  'Best Supporting Actress',
  'Best Director'
];

// Rate limiting: 50 requests per second max, we'll do 3 per second to be safe
const RATE_LIMIT_DELAY = 350; // ms between requests
const BATCH_SIZE = 50; // Process in batches
const LOG_FILE = path.join(__dirname, 'oscar-people-populate.log');

/**
 * Log to both console and file
 */
function log(message) {
  console.log(message);
  fs.appendFileSync(LOG_FILE, message + '\n');
}

/**
 * Search for a person on TMDB by name
 */
async function searchPerson(name, retries = 3) {
  const url = `${TMDB_BASE_URL}/search/person?query=${encodeURIComponent(name)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 429) {
        // Rate limited, wait longer
        log(`Rate limited, waiting 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.results;

    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      log(`Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Find the best matching person from search results
 */
function findBestMatch(results, searchName, categoryName) {
  if (results.length === 0) return null;

  const isActingCategory = categoryName.includes('Actor') || categoryName.includes('Actress');
  const isDirectorCategory = categoryName === 'Best Director';

  let filtered = results;

  // Filter by department
  if (isActingCategory) {
    const actingResults = results.filter(p => p.known_for_department === 'Acting');
    if (actingResults.length > 0) {
      filtered = actingResults;
    }
  } else if (isDirectorCategory) {
    const directingResults = results.filter(p => p.known_for_department === 'Directing');
    if (directingResults.length > 0) {
      filtered = directingResults;
    }
  }

  return filtered[0];
}

/**
 * Process a single nomination
 */
async function processNomination(nomination, category) {
  try {
    const results = await searchPerson(nomination.nominee_name);

    if (results.length === 0) {
      return {
        success: false,
        reason: 'No results',
        nominee_name: nomination.nominee_name,
        category: category.name,
        year: nomination.ceremony_year
      };
    }

    const bestMatch = findBestMatch(results, nomination.nominee_name, category.name);

    if (!bestMatch) {
      return {
        success: false,
        reason: 'No suitable match',
        nominee_name: nomination.nominee_name,
        category: category.name,
        year: nomination.ceremony_year
      };
    }

    // Update the database
    await prisma.oscarNomination.update({
      where: { id: nomination.id },
      data: {
        person_id: bestMatch.id,
        profile_path: bestMatch.profile_path,
      },
    });

    return {
      success: true,
      person_id: bestMatch.id,
      profile_path: bestMatch.profile_path,
      tmdb_name: bestMatch.name,
      nominee_name: nomination.nominee_name,
      category: category.name,
      year: nomination.ceremony_year,
      popularity: bestMatch.popularity
    };

  } catch (error) {
    return {
      success: false,
      reason: error.message,
      nominee_name: nomination.nominee_name,
      category: category.name,
      year: nomination.ceremony_year
    };
  }
}

/**
 * Main function
 */
async function main() {
  // Clear previous log
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }

  log('=== Populating All Oscar Nominations with Person Data ===\n');
  log(`Started at: ${new Date().toISOString()}\n`);

  try {
    // Get all unprocessed nominations with nominee names
    const nominations = await prisma.oscarNomination.findMany({
      where: {
        nominee_name: { not: null },
        person_id: null, // Only unprocessed
        category: {
          name: { in: PERSON_CATEGORIES }
        }
      },
      include: {
        category: true,
        movie: true
      },
      orderBy: [
        { ceremony_year: 'asc' },
        { category_id: 'asc' }
      ]
    });

    log(`Found ${nominations.length} nominations to process\n`);

    if (nominations.length === 0) {
      log('✅ All nominations already have person data!');
      return;
    }

    // Process in batches
    const totalBatches = Math.ceil(nominations.length / BATCH_SIZE);
    const results = [];

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, nominations.length);
      const batch = nominations.slice(batchStart, batchEnd);

      log(`\n--- Batch ${batchIndex + 1}/${totalBatches} (${batchStart + 1}-${batchEnd}/${nominations.length}) ---`);

      for (let i = 0; i < batch.length; i++) {
        const nomination = batch[i];
        const progress = batchStart + i + 1;

        process.stdout.write(`[${progress}/${nominations.length}] ${nomination.nominee_name} (${nomination.category.name}, ${nomination.ceremony_year})... `);

        const result = await processNomination(nomination, nomination.category);
        results.push(result);

        if (result.success) {
          console.log(`✅ ${result.tmdb_name}`);
        } else {
          console.log(`❌ ${result.reason}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }

      // Log batch summary
      const batchSuccesses = results.slice(batchStart, batchEnd).filter(r => r.success).length;
      log(`Batch complete: ${batchSuccesses}/${batch.length} successful\n`);
    }

    // Final Summary
    log('\n\n=== FINAL SUMMARY ===');
    log(`Total processed: ${results.length}`);
    log(`Successful: ${results.filter(r => r.success).length}`);
    log(`Failed: ${results.filter(r => !r.success).length}`);
    log(`Success rate: ${((results.filter(r => r.success).length / results.length) * 100).toFixed(1)}%`);

    // Group failures by reason
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      log('\n--- Failed Matches by Reason ---');
      const failuresByReason = {};
      failures.forEach(f => {
        if (!failuresByReason[f.reason]) {
          failuresByReason[f.reason] = [];
        }
        failuresByReason[f.reason].push(f);
      });

      Object.entries(failuresByReason).forEach(([reason, fails]) => {
        log(`\n${reason} (${fails.length}):`);
        fails.forEach(f => {
          log(`  - ${f.nominee_name} (${f.category}, ${f.year})`);
        });
      });

      // Write failures to CSV for manual review
      const csvPath = path.join(__dirname, 'oscar-people-failures.csv');
      const csvContent = 'Nominee Name,Category,Year,Reason\n' +
        failures.map(f => `"${f.nominee_name}","${f.category}",${f.year},"${f.reason}"`).join('\n');
      fs.writeFileSync(csvPath, csvContent);
      log(`\nFailures exported to: ${csvPath}`);
    }

    // Statistics by category
    log('\n--- Statistics by Category ---');
    const byCategory = {};
    PERSON_CATEGORIES.forEach(cat => {
      const catResults = results.filter(r => r.category === cat);
      const catSuccess = catResults.filter(r => r.success).length;
      byCategory[cat] = { total: catResults.length, success: catSuccess };
      log(`${cat}: ${catSuccess}/${catResults.length} (${((catSuccess / catResults.length) * 100).toFixed(1)}%)`);
    });

    log(`\nCompleted at: ${new Date().toISOString()}`);
    log(`Log saved to: ${LOG_FILE}`);

  } catch (error) {
    log('\n❌ Fatal error: ' + error.message);
    log(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
