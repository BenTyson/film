/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const RATE_LIMIT_DELAY = 250; // ms between TMDB API calls

function normalizeYear(year) {
  // Handle cases like "1927/28" -> 1928
  let filmYear;
  if (year.includes('/')) {
    const parts = year.split('/');
    const firstYear = parseInt(parts[0]);
    const secondYear = parseInt(parts[1]);
    // If second part is 2 digits, assume it's the latter half of the century
    if (secondYear < 100) {
      const century = Math.floor(firstYear / 100) * 100;
      filmYear = century + secondYear;
    } else {
      filmYear = secondYear;
    }
  } else {
    filmYear = parseInt(year);
  }

  // Convert film year to ceremony year (+1)
  // Films from year X are honored at ceremony in year X+1
  // Example: 2022 films honored at 2023 ceremony (95th Academy Awards, March 2023)
  return filmYear + 1;
}

function categorizeCategory(category) {
  if (category.includes('Actor') || category.includes('Actress')) return 'Acting';
  if (category.includes('Director')) return 'Directing';
  if (category === 'Best Picture') return 'Best Picture';
  return 'Technical';
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '') // Remove leading articles
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function calculateSimilarity(str1, str2) {
  // Simple Levenshtein distance normalized to 0-1 scale
  const normalize1 = normalizeTitle(str1);
  const normalize2 = normalizeTitle(str2);

  if (normalize1 === normalize2) return 1.0;

  const longer = normalize1.length > normalize2.length ? normalize1 : normalize2;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(normalize1, normalize2);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyMovieWithTMDB(movie, ceremonyYear) {
  if (!movie.tmdb_id) {
    return {
      review_status: 'needs_manual_review',
      confidence_score: 0,
      verification_notes: 'No TMDB ID in source data'
    };
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.tmdb_id}`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return {
        review_status: 'needs_manual_review',
        confidence_score: 0,
        verification_notes: `TMDB API error: ${response.status}`
      };
    }

    const tmdbData = await response.json();

    // Extract year from release_date
    const tmdbYear = tmdbData.release_date ? parseInt(tmdbData.release_date.split('-')[0]) : null;
    // Films are usually released the year before the ceremony
    // Example: 2023 ceremony honors 2022 films
    const expectedYear = ceremonyYear - 1;

    // Check title similarity
    const titleSimilarity = calculateSimilarity(movie.title, tmdbData.title);
    const originalTitleSimilarity = tmdbData.original_title ?
      calculateSimilarity(movie.title, tmdbData.original_title) : 0;
    const bestTitleSimilarity = Math.max(titleSimilarity, originalTitleSimilarity);

    // Check year match (allow ±1 year tolerance)
    const yearMatch = tmdbYear && Math.abs(expectedYear - tmdbYear) <= 1;

    // Determine verification status
    const titleThreshold = 0.85; // 85% similarity required

    if (bestTitleSimilarity >= titleThreshold && yearMatch) {
      return {
        review_status: 'auto_verified',
        confidence_score: bestTitleSimilarity,
        verification_notes: null
      };
    } else if (bestTitleSimilarity >= titleThreshold && !tmdbYear) {
      // Title matches but no year in TMDB data
      return {
        review_status: 'auto_verified',
        confidence_score: bestTitleSimilarity * 0.9,
        verification_notes: 'No release year in TMDB data'
      };
    } else {
      // Flag for manual review
      const notes = [];
      if (bestTitleSimilarity < titleThreshold) {
        notes.push(`Title mismatch: "${movie.title}" vs "${tmdbData.title}" (${(bestTitleSimilarity * 100).toFixed(0)}% similar)`);
      }
      if (!yearMatch && tmdbYear) {
        notes.push(`Year mismatch: ${ceremonyYear} ceremony expected ${expectedYear} film, got ${tmdbYear}`);
      }

      return {
        review_status: 'needs_manual_review',
        confidence_score: bestTitleSimilarity,
        verification_notes: notes.join('; ')
      };
    }

  } catch (error) {
    return {
      review_status: 'needs_manual_review',
      confidence_score: 0,
      verification_notes: `Verification error: ${error.message}`
    };
  }
}

async function main() {
  console.log('🎬 Starting INCREMENTAL Oscar nominations import...');

  // Get list of categories to import from command line args
  const targetCategories = process.argv.slice(2);

  if (targetCategories.length === 0) {
    console.error('❌ Please specify categories to import as arguments');
    console.error('Example: node scripts/import-oscars-incremental.js "Best Supporting Actor" "Best Supporting Actress"');
    process.exit(1);
  }

  console.log(`📂 Target categories: ${targetCategories.join(', ')}`);

  // Load the Oscar nominations data
  const dataPath = path.join(__dirname, '..', 'oscar-nominations.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Oscar nominations data file not found at:', dataPath);
    process.exit(1);
  }

  const allOscarData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const oscarData = allOscarData.filter(nomination => targetCategories.includes(nomination.category));

  console.log(`📊 Loaded ${allOscarData.length} total nominations, filtered to ${oscarData.length} for target categories`);

  // Check which categories already exist
  const existingCategories = await prisma.oscarCategory.findMany({
    where: {
      name: {
        in: targetCategories
      }
    }
  });

  if (existingCategories.length > 0) {
    console.log(`⚠️  Warning: ${existingCategories.length} categories already exist:`);
    existingCategories.forEach(cat => console.log(`   - ${cat.name}`));
    console.log('Skipping these categories to preserve existing data.');

    const existingNames = existingCategories.map(c => c.name);
    const newCategories = targetCategories.filter(name => !existingNames.includes(name));

    if (newCategories.length === 0) {
      console.log('✅ No new categories to import. Exiting.');
      await prisma.$disconnect();
      return;
    }

    console.log(`📂 Will import only: ${newCategories.join(', ')}`);
    // Filter to only new categories
    const filteredData = oscarData.filter(nom => newCategories.includes(nom.category));
    oscarData.length = 0;
    oscarData.push(...filteredData);
  }

  const stats = {
    categories_created: 0,
    movies_created: 0,
    movies_verified: 0,
    movies_auto_verified: 0,
    movies_needs_review: 0,
    movies_skipped_existing: 0,
    nominations_created: 0,
    errors: 0,
    processed: 0
  };

  try {
    // Create new categories only
    console.log('📁 Creating new categories...');
    const uniqueCategories = [...new Set(oscarData.map(n => n.category))];
    const categoryData = uniqueCategories.map(categoryName => ({
      name: categoryName,
      category_group: categorizeCategory(categoryName)
    }));

    for (const catData of categoryData) {
      await prisma.oscarCategory.upsert({
        where: { name: catData.name },
        create: catData,
        update: {} // Don't update if exists
      });
      stats.categories_created++;
    }

    const createdCategories = await prisma.oscarCategory.findMany();
    const categoryMap = new Map();
    createdCategories.forEach(category => {
      categoryMap.set(category.name, category.id);
    });
    console.log(`✅ Created ${stats.categories_created} new categories`);

    // Extract unique movies and check which ones already exist
    console.log('🎭 Extracting unique movies...');
    const uniqueMoviesWithContext = new Map();

    oscarData.forEach(nomination => {
      nomination.movies.forEach(movie => {
        const key = movie.tmdb_id || `no-tmdb-${movie.title}`;
        if (!uniqueMoviesWithContext.has(key)) {
          uniqueMoviesWithContext.set(key, {
            movie,
            ceremonyYear: normalizeYear(nomination.year)
          });
        }
      });
    });

    const totalMovies = uniqueMoviesWithContext.size;
    console.log(`📊 Found ${totalMovies} unique movies (some may already exist)`);

    // Check which movies already exist
    const tmdbIds = Array.from(uniqueMoviesWithContext.values())
      .map(({ movie }) => movie.tmdb_id)
      .filter(id => id);

    const existingMovies = await prisma.oscarMovie.findMany({
      where: {
        tmdb_id: {
          in: tmdbIds
        }
      },
      select: {
        tmdb_id: true,
        id: true,
        review_status: true
      }
    });

    const existingMovieMap = new Map();
    existingMovies.forEach(movie => {
      existingMovieMap.set(movie.tmdb_id, movie);
    });

    console.log(`✅ Found ${existingMovies.length} movies already in database (will skip verification)`);

    // Verify and create only NEW movies
    console.log('🔍 Verifying NEW movies with TMDB...');
    const verificationResults = new Map();
    const moviesToCreate = [];
    let verifiedCount = 0;

    for (const [key, { movie, ceremonyYear }] of uniqueMoviesWithContext) {
      const existingMovie = movie.tmdb_id ? existingMovieMap.get(movie.tmdb_id) : null;

      if (existingMovie) {
        // Movie already exists - skip verification, preserve existing status
        stats.movies_skipped_existing++;
        verificationResults.set(key, {
          id: existingMovie.id,
          existing: true
        });
      } else {
        // New movie - verify with TMDB
        verifiedCount++;

        if (verifiedCount % 50 === 0) {
          console.log(`   Progress: ${verifiedCount}/${totalMovies - existingMovies.length} new movies verified`);
        }

        const verification = await verifyMovieWithTMDB(movie, ceremonyYear);
        verificationResults.set(key, verification);

        if (verification.review_status === 'auto_verified') {
          stats.movies_auto_verified++;
        } else {
          stats.movies_needs_review++;
        }

        moviesToCreate.push({
          title: movie.title,
          tmdb_id: movie.tmdb_id,
          imdb_id: movie.imdb_id,
          review_status: verification.review_status,
          confidence_score: verification.confidence_score,
          verification_notes: verification.verification_notes
        });

        // Rate limiting
        await delay(RATE_LIMIT_DELAY);
      }
    }

    stats.movies_verified = verifiedCount;
    console.log(`✅ Verified ${stats.movies_verified} new movies`);
    console.log(`   Auto-verified: ${stats.movies_auto_verified}`);
    console.log(`   Needs review: ${stats.movies_needs_review}`);
    console.log(`   Skipped (existing): ${stats.movies_skipped_existing}`);

    // Insert new movies
    if (moviesToCreate.length > 0) {
      console.log('💾 Inserting new movies into database...');
      await prisma.oscarMovie.createMany({ data: moviesToCreate });
      stats.movies_created = moviesToCreate.length;
      console.log(`✅ Created ${stats.movies_created} new movies`);
    }

    // Get updated movie map (including newly created movies)
    const allMovies = await prisma.oscarMovie.findMany();
    const movieMap = new Map();
    allMovies.forEach(movie => {
      const key = movie.tmdb_id || `no-tmdb-${movie.title}`;
      movieMap.set(key, movie.id);
    });

    // Create nominations (check for duplicates)
    console.log('🏆 Creating nominations...');
    const nominationData = [];

    for (const nomination of oscarData) {
      stats.processed++;

      if (stats.processed % 100 === 0) {
        console.log(`📈 Processed ${stats.processed}/${oscarData.length} nominations...`);
      }

      const ceremonyYear = normalizeYear(nomination.year);
      const categoryId = categoryMap.get(nomination.category);

      if (!categoryId) {
        console.error(`❌ Category not found: ${nomination.category}`);
        stats.errors++;
        continue;
      }

      const nominees = nomination.nominees.length > 0 ? nomination.nominees : [null];

      for (const nominee of nominees) {
        let movieId = null;
        if (nomination.movies.length > 0) {
          const movie = nomination.movies[0];
          const movieKey = movie.tmdb_id || `no-tmdb-${movie.title}`;
          movieId = movieMap.get(movieKey);
        }

        // Check if this nomination already exists
        const existingNomination = await prisma.oscarNomination.findFirst({
          where: {
            ceremony_year: ceremonyYear,
            category_id: categoryId,
            movie_id: movieId,
            nominee_name: nominee
          }
        });

        if (!existingNomination) {
          nominationData.push({
            ceremony_year: ceremonyYear,
            category_id: categoryId,
            movie_id: movieId,
            nominee_name: nominee,
            is_winner: nomination.won
          });
        }
      }
    }

    // Insert all nominations at once
    if (nominationData.length > 0) {
      console.log(`💾 Inserting ${nominationData.length} new nominations...`);
      await prisma.oscarNomination.createMany({ data: nominationData });
      stats.nominations_created = nominationData.length;
    }

    console.log('🎉 Import completed successfully!');
    console.log('📈 Final Stats:');
    console.log(`   Categories: ${stats.categories_created} new`);
    console.log(`   Movies Created: ${stats.movies_created}`);
    console.log(`   Movies Verified: ${stats.movies_verified}`);
    console.log(`     ✓ Auto-verified: ${stats.movies_auto_verified}`);
    console.log(`     ⚠ Needs Review: ${stats.movies_needs_review}`);
    console.log(`   Movies Preserved: ${stats.movies_skipped_existing} (existing)`);
    console.log(`   Nominations: ${stats.nominations_created} new`);
    console.log(`   Errors: ${stats.errors}`);

  } catch (error) {
    console.error('❌ Error during import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
