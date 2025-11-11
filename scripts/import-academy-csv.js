/**
 * Import Oscar Data from academy.csv
 *
 * This script:
 * 1. Parses academy.csv (ceremony years 1928-2025)
 * 2. Searches TMDB for each movie using release_year = ceremony_year - 1
 * 3. Imports movies and nominations into the database
 * 4. Reports movies that couldn't be matched to TMDB
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Parse CSV line handling quoted values with commas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

// Extract movie titles from a cell (comma-separated, winner marked)
function extractMovies(cell, ceremonyYear) {
  if (!cell) return [];

  const movies = [];
  const parts = cell.split(',').map(s => s.trim());

  for (const part of parts) {
    const isWinner = part.includes('(winner)');
    const title = part.replace(/\s*\(winner\)\s*$/i, '').trim();

    if (title) {
      movies.push({ title, ceremonyYear, isWinner });
    }
  }

  return movies;
}

// Extract nominees from actor/director cell (format: "Name – Movie (winner)")
function extractNominees(cell, ceremonyYear) {
  if (!cell) return [];

  const nominees = [];
  const parts = cell.split(',').map(s => s.trim());

  for (const part of parts) {
    const isWinner = part.includes('(winner)');
    const cleanPart = part.replace(/\s*\(winner\)\s*$/i, '').trim();

    // Handle tied winners like "(winner) (tied)"
    const isTied = part.includes('(tie)') || part.includes('(tied)');

    // Split on " – " to separate name and movie
    const dashMatch = cleanPart.match(/^(.+?)\s+–\s+(.+)$/);

    if (dashMatch) {
      const name = dashMatch[1].trim();
      const movie = dashMatch[2].trim();

      nominees.push({ name, movie, ceremonyYear, isWinner, isTied });
    }
  }

  return nominees;
}

// Search TMDB for movie
async function searchTMDB(title, releaseYear) {
  try {
    const query = encodeURIComponent(title);
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}&year=${releaseYear}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // Return first result (best match)
      return {
        tmdb_id: data.results[0].id,
        imdb_id: null, // Will fetch later if needed
        title: data.results[0].title,
        release_year: releaseYear
      };
    }

    return null;
  } catch (error) {
    console.error(`   ⚠️  TMDB search error for "${title}": ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🎬 Import Oscar Data from academy.csv\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Read CSV
  const csvPath = path.join(__dirname, '..', 'academy.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  console.log(`📄 Read ${lines.length} lines from CSV\n`);

  // Parse CSV
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => parseCSVLine(line));

  console.log(`📊 Parsing ${rows.length} ceremony years\n`);

  // Collect all unique movies
  const movieMap = new Map(); // title -> {ceremonyYear, isWinner}
  const allNominations = [];

  // Get category IDs
  const categories = {
    'Best Picture': await prisma.oscarCategory.findFirst({ where: { name: 'Best Picture' } }),
    'Best Actor': await prisma.oscarCategory.findFirst({ where: { name: 'Best Actor' } }),
    'Best Actress': await prisma.oscarCategory.findFirst({ where: { name: 'Best Actress' } }),
    'Best Director': await prisma.oscarCategory.findFirst({ where: { name: 'Best Director' } })
  };

  console.log('📋 Category IDs:');
  Object.entries(categories).forEach(([name, cat]) => {
    console.log(`   ${name}: ${cat?.id || 'NOT FOUND'}`);
  });
  console.log();

  // Parse all rows
  for (const row of rows) {
    const yearCell = row[0]; // e.g., "2025 (97th)"
    const ceremonyYear = parseInt(yearCell.match(/^\d{4}/)[0]);

    // Best Picture
    const bestPictureMovies = extractMovies(row[1], ceremonyYear);
    for (const movie of bestPictureMovies) {
      if (!movieMap.has(movie.title)) {
        movieMap.set(movie.title, movie);
      }
      allNominations.push({
        categoryName: 'Best Picture',
        categoryId: categories['Best Picture'].id,
        movieTitle: movie.title,
        ceremonyYear,
        nomineeName: null,
        isWinner: movie.isWinner
      });
    }

    // Best Actor
    const bestActorNominees = extractNominees(row[2], ceremonyYear);
    for (const nominee of bestActorNominees) {
      if (!movieMap.has(nominee.movie)) {
        movieMap.set(nominee.movie, { title: nominee.movie, ceremonyYear, isWinner: false });
      }
      allNominations.push({
        categoryName: 'Best Actor',
        categoryId: categories['Best Actor'].id,
        movieTitle: nominee.movie,
        ceremonyYear,
        nomineeName: nominee.name,
        isWinner: nominee.isWinner
      });
    }

    // Best Actress
    const bestActressNominees = extractNominees(row[3], ceremonyYear);
    for (const nominee of bestActressNominees) {
      if (!movieMap.has(nominee.movie)) {
        movieMap.set(nominee.movie, { title: nominee.movie, ceremonyYear, isWinner: false });
      }
      allNominations.push({
        categoryName: 'Best Actress',
        categoryId: categories['Best Actress'].id,
        movieTitle: nominee.movie,
        ceremonyYear,
        nomineeName: nominee.name,
        isWinner: nominee.isWinner
      });
    }

    // Best Director
    const bestDirectorNominees = extractNominees(row[4], ceremonyYear);
    for (const nominee of bestDirectorNominees) {
      if (!movieMap.has(nominee.movie)) {
        movieMap.set(nominee.movie, { title: nominee.movie, ceremonyYear, isWinner: false });
      }
      allNominations.push({
        categoryName: 'Best Director',
        categoryId: categories['Best Director'].id,
        movieTitle: nominee.movie,
        ceremonyYear,
        nomineeName: nominee.name,
        isWinner: nominee.isWinner
      });
    }
  }

  console.log(`🎬 Found ${movieMap.size} unique movies`);
  console.log(`📝 Found ${allNominations.length} total nominations\n`);

  // Search TMDB for each movie
  console.log('🔍 Searching TMDB for movies...\n');

  const movieData = [];
  let foundCount = 0;
  let notFoundCount = 0;

  const movies = Array.from(movieMap.values());

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    const releaseYear = movie.ceremonyYear - 1; // KEY: ceremony year - 1 = release year

    if (i % 50 === 0) {
      console.log(`   Progress: ${i}/${movies.length} movies...`);
    }

    const tmdbResult = await searchTMDB(movie.title, releaseYear);

    if (tmdbResult) {
      movieData.push({
        title: movie.title,
        tmdb_id: tmdbResult.tmdb_id,
        imdb_id: null,
        ceremonyYear: movie.ceremonyYear
      });
      foundCount++;
    } else {
      movieData.push({
        title: movie.title,
        tmdb_id: null,
        imdb_id: null,
        ceremonyYear: movie.ceremonyYear
      });
      notFoundCount++;
    }

    // Rate limit: 40 requests per second for TMDB
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  console.log(`\n   ✓ Found on TMDB: ${foundCount} movies`);
  console.log(`   ⚠️  Not found: ${notFoundCount} movies\n`);

  // Insert movies
  console.log('💾 Inserting movies into database...\n');

  const movieIdMap = new Map(); // title -> database id

  for (const movie of movieData) {
    const inserted = await prisma.oscarMovie.create({
      data: {
        title: movie.title,
        tmdb_id: movie.tmdb_id,
        imdb_id: movie.imdb_id
      }
    });

    movieIdMap.set(movie.title, inserted.id);
  }

  console.log(`   ✓ Inserted ${movieData.length} movies\n`);

  // Insert nominations
  console.log('💾 Inserting nominations into database...\n');

  for (const nomination of allNominations) {
    const movieId = movieIdMap.get(nomination.movieTitle);

    if (!movieId) {
      console.log(`   ⚠️  Skipping nomination: movie "${nomination.movieTitle}" not found`);
      continue;
    }

    await prisma.oscarNomination.create({
      data: {
        ceremony_year: nomination.ceremonyYear,
        category_id: nomination.categoryId,
        movie_id: movieId,
        nominee_name: nomination.nomineeName,
        is_winner: nomination.isWinner
      }
    });
  }

  console.log(`   ✓ Inserted ${allNominations.length} nominations\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Import complete!\n');
  console.log('Summary:');
  console.log(`   Movies imported: ${movieData.length}`);
  console.log(`   - With TMDB IDs: ${foundCount}`);
  console.log(`   - Missing TMDB IDs: ${notFoundCount}`);
  console.log(`   Nominations imported: ${allNominations.length}`);
  console.log(`   Years: 1928-2025 (97 ceremonies)\n`);

  if (notFoundCount > 0) {
    console.log('📊 Next steps:');
    console.log('   1. Go to http://localhost:3000/oscars');
    console.log('   2. Switch to Table view');
    console.log('   3. Look for movies with "No TMDB ID"');
    console.log('   4. Provide TMDB IDs manually for those movies\n');
  }

  await prisma.$disconnect();
}

main().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
