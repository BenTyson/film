const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const TARGET_CATEGORIES = ['Best Picture', 'Best Actor', 'Best Actress', 'Best Director'];

function normalizeYear(year) {
  // Handle cases like "1927/28" -> 1928
  if (year.includes('/')) {
    const parts = year.split('/');
    const firstYear = parseInt(parts[0]);
    const secondYear = parseInt(parts[1]);
    // If second part is 2 digits, assume it's the latter half of the century
    if (secondYear < 100) {
      const century = Math.floor(firstYear / 100) * 100;
      return century + secondYear;
    }
    return secondYear;
  }
  return parseInt(year);
}

function categorizeCategory(category) {
  if (category.includes('Actor') || category.includes('Actress')) return 'Acting';
  if (category.includes('Director')) return 'Directing';
  if (category === 'Best Picture') return 'Best Picture';
  return 'Technical';
}

async function main() {
  console.log('🎬 Starting Oscar nominations import...');
  console.log(`📂 Target categories: ${TARGET_CATEGORIES.join(', ')}`);

  // Load the Oscar nominations data
  const dataPath = path.join(__dirname, '..', 'src', 'data', 'oscar-nominations.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Oscar nominations data file not found');
    process.exit(1);
  }

  const allOscarData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const oscarData = allOscarData.filter(nomination => TARGET_CATEGORIES.includes(nomination.category));

  console.log(`📊 Loaded ${allOscarData.length} total nominations, filtered to ${oscarData.length} for target categories`);

  // Clear existing data
  console.log('🗑️  Clearing existing Oscar data...');
  await prisma.oscarNomination.deleteMany();
  await prisma.oscarMovie.deleteMany();
  await prisma.oscarCategory.deleteMany();

  const stats = {
    categories_created: 0,
    movies_created: 0,
    nominations_created: 0,
    errors: 0,
    processed: 0
  };

  try {
    // Create categories
    console.log('📁 Creating categories...');
    const uniqueCategories = [...new Set(oscarData.map(n => n.category))];
    const categoryData = uniqueCategories.map(categoryName => ({
      name: categoryName,
      category_group: categorizeCategory(categoryName)
    }));

    await prisma.oscarCategory.createMany({ data: categoryData });
    const createdCategories = await prisma.oscarCategory.findMany();
    const categoryMap = new Map();
    createdCategories.forEach(category => {
      categoryMap.set(category.name, category.id);
    });
    stats.categories_created = uniqueCategories.length;
    console.log(`✅ Created ${stats.categories_created} categories`);

    // Create movies
    console.log('🎭 Creating movies...');
    const uniqueMovies = new Map();
    oscarData.forEach(nomination => {
      nomination.movies.forEach(movie => {
        const key = `${movie.title}-${movie.tmdb_id || 'no-tmdb'}`;
        if (!uniqueMovies.has(key)) {
          uniqueMovies.set(key, movie);
        }
      });
    });

    const movieData = Array.from(uniqueMovies.values()).map(movie => ({
      title: movie.title,
      tmdb_id: movie.tmdb_id,
      imdb_id: movie.imdb_id
    }));

    await prisma.oscarMovie.createMany({ data: movieData });
    const createdMovies = await prisma.oscarMovie.findMany();
    const movieMap = new Map();
    createdMovies.forEach(movie => {
      const key = `${movie.title}-${movie.tmdb_id || 'no-tmdb'}`;
      movieMap.set(key, movie.id);
    });
    stats.movies_created = createdMovies.length;
    console.log(`✅ Created ${stats.movies_created} movies`);

    // Create nominations
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
          const movieKey = `${movie.title}-${movie.tmdb_id || 'no-tmdb'}`;
          movieId = movieMap.get(movieKey);
        }

        nominationData.push({
          ceremony_year: ceremonyYear,
          category_id: categoryId,
          movie_id: movieId,
          nominee_name: nominee,
          is_winner: nomination.won
        });
      }
    }

    // Insert all nominations at once
    console.log(`💾 Inserting ${nominationData.length} nominations...`);
    await prisma.oscarNomination.createMany({ data: nominationData });
    stats.nominations_created = nominationData.length;

    console.log('🎉 Import completed successfully!');
    console.log('📈 Final Stats:');
    console.log(`   Categories: ${stats.categories_created}`);
    console.log(`   Movies: ${stats.movies_created}`);
    console.log(`   Nominations: ${stats.nominations_created}`);
    console.log(`   Errors: ${stats.errors}`);

  } catch (error) {
    console.error('❌ Error during import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();