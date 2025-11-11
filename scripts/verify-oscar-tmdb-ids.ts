#!/usr/bin/env npx tsx

import { prisma } from '../src/lib/prisma';
import { tmdb } from '../src/lib/tmdb';

interface MovieToCheck {
  tmdb_id: number;
  expected_title: string;
}

const moviesToCheck: MovieToCheck[] = [
  { tmdb_id: 530915, expected_title: "Green Book" },
  { tmdb_id: 284054, expected_title: "Black Panther" },
  { tmdb_id: 440249, expected_title: "BlacKkKlansman" },
  { tmdb_id: 424694, expected_title: "Bohemian Rhapsody" },
  { tmdb_id: 519179, expected_title: "The Favourite" },
  { tmdb_id: 426426, expected_title: "Roma" },
  { tmdb_id: 332562, expected_title: "A Star Is Born" },
  { tmdb_id: 382254, expected_title: "Vice" },
  { tmdb_id: 492167, expected_title: "At Eternity's Gate" },
  { tmdb_id: 522681, expected_title: "Cold War" },
  { tmdb_id: 399579, expected_title: "The Wife" },
  { tmdb_id: 489066, expected_title: "Can You Ever Forgive Me?" }
];

const categoriesToCheck = [
  "Best Picture",
  "Best Director",
  "Best Actor",
  "Best Actress"
];

async function verifyOscarTMDBIds() {
  console.log('🎬 Verifying TMDB IDs for 2019 Oscar Nominations\n');
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Check which movies already exist in oscar_movies
    console.log('📊 STEP 1: Checking existing OscarMovie records...\n');
    
    const tmdbIdsToCheck = moviesToCheck.map(m => m.tmdb_id);
    const existingMovies = await prisma.oscarMovie.findMany({
      where: {
        tmdb_id: {
          in: tmdbIdsToCheck
        }
      },
      select: {
        id: true,
        tmdb_id: true,
        imdb_id: true,
        title: true
      }
    });

    console.log(`Found ${existingMovies.length} existing movies in oscar_movies table:\n`);
    existingMovies.forEach(movie => {
      console.log(`  ✓ ID: ${movie.id}, TMDB: ${movie.tmdb_id}, Title: "${movie.title}"`);
      if (movie.imdb_id) {
        console.log(`    IMDB: ${movie.imdb_id}`);
      }
    });
    console.log();

    // Step 2: Verify TMDB IDs by calling TMDB API
    console.log('🔍 STEP 2: Verifying TMDB IDs via TMDB API...\n');

    const tmdbResults: Array<{
      tmdb_id: number;
      expected_title: string;
      verified: boolean;
      actual_title?: string;
      imdb_id?: string | null;
      release_date?: string;
      error?: string;
    }> = [];

    for (const movie of moviesToCheck) {
      try {
        console.log(`Checking TMDB ID ${movie.tmdb_id} (${movie.expected_title})...`);
        const movieDetails = await tmdb.getMovieDetails(movie.tmdb_id);
        
        const titleMatches = movieDetails.title.toLowerCase() === movie.expected_title.toLowerCase() ||
                           movieDetails.title.toLowerCase().includes(movie.expected_title.toLowerCase()) ||
                           movie.expected_title.toLowerCase().includes(movieDetails.title.toLowerCase());
        
        tmdbResults.push({
          tmdb_id: movie.tmdb_id,
          expected_title: movie.expected_title,
          verified: titleMatches,
          actual_title: movieDetails.title,
          imdb_id: movieDetails.imdb_id,
          release_date: movieDetails.release_date
        });

        if (titleMatches) {
          console.log(`  ✓ Verified: "${movieDetails.title}"`);
        } else {
          console.log(`  ⚠️  Title mismatch: Expected "${movie.expected_title}", Got "${movieDetails.title}"`);
        }
        console.log(`    IMDB ID: ${movieDetails.imdb_id || 'N/A'}`);
        console.log(`    Release Date: ${movieDetails.release_date || 'N/A'}`);
        console.log();

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));
        
      } catch (error: any) {
        console.log(`  ❌ Error: ${error.message}`);
        tmdbResults.push({
          tmdb_id: movie.tmdb_id,
          expected_title: movie.expected_title,
          verified: false,
          error: error.message
        });
        console.log();
      }
    }

    // Step 3: Check OscarCategory IDs
    console.log('\n📋 STEP 3: Checking OscarCategory IDs...\n');

    const categories = await prisma.oscarCategory.findMany({
      where: {
        name: {
          in: categoriesToCheck
        }
      },
      select: {
        id: true,
        name: true,
        category_group: true,
        is_active: true
      }
    });

    if (categories.length > 0) {
      console.log(`Found ${categories.length} categories:\n`);
      categories.forEach(cat => {
        console.log(`  ✓ ID: ${cat.id}, Name: "${cat.name}"`);
        console.log(`    Group: ${cat.category_group || 'N/A'}, Active: ${cat.is_active}`);
      });
    } else {
      console.log('⚠️  No categories found! Categories may need to be created.');
    }
    console.log();

    // Step 4: Generate summary
    console.log('\n' + '='.repeat(80));
    console.log('📝 SUMMARY\n');
    console.log('='.repeat(80) + '\n');

    console.log('Movies that NEED to be inserted into oscar_movies:\n');
    const existingTmdbIds = new Set(existingMovies.map(m => m.tmdb_id));
    const moviesToInsert = tmdbResults.filter(m => !existingTmdbIds.has(m.tmdb_id) && m.verified);
    
    if (moviesToInsert.length > 0) {
      moviesToInsert.forEach(movie => {
        console.log(`  • TMDB: ${movie.tmdb_id}`);
        console.log(`    Title: "${movie.actual_title}"`);
        console.log(`    IMDB ID: ${movie.imdb_id || 'N/A'}`);
        console.log(`    Release Date: ${movie.release_date || 'N/A'}`);
        console.log();
      });
    } else {
      console.log('  None - all verified movies already exist!\n');
    }

    console.log('Movies that ALREADY EXIST in oscar_movies:\n');
    if (existingMovies.length > 0) {
      existingMovies.forEach(movie => {
        console.log(`  • Oscar Movie ID: ${movie.id}`);
        console.log(`    TMDB ID: ${movie.tmdb_id}`);
        console.log(`    Title: "${movie.title}"`);
        console.log(`    IMDB ID: ${movie.imdb_id || 'N/A'}`);
        console.log();
      });
    } else {
      console.log('  None\n');
    }

    console.log('Category IDs:\n');
    if (categories.length > 0) {
      categories.forEach(cat => {
        console.log(`  • ${cat.name}: ${cat.id}`);
      });
      console.log();
    } else {
      console.log('  ⚠️  Categories not found - they need to be created first!\n');
    }

    console.log('TMDB ID Verification Issues:\n');
    const issues = tmdbResults.filter(m => !m.verified);
    if (issues.length > 0) {
      issues.forEach(movie => {
        console.log(`  • TMDB: ${movie.tmdb_id} - ${movie.expected_title}`);
        if (movie.error) {
          console.log(`    Error: ${movie.error}`);
        } else if (movie.actual_title) {
          console.log(`    Title mismatch: Got "${movie.actual_title}"`);
        }
        console.log();
      });
    } else {
      console.log('  None - all TMDB IDs verified successfully! ✓\n');
    }

    console.log('='.repeat(80));
    console.log('\n✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  verifyOscarTMDBIds()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { verifyOscarTMDBIds };
