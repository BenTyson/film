import { PrismaClient } from '@prisma/client';
import { tmdb } from '../src/lib/tmdb';

const prisma = new PrismaClient();

// Popular movies for testing - mix of recent and classics
const testMovies = [
  { title: 'The Matrix', year: 1999 },
  { title: 'Inception', year: 2010 },
  { title: 'Pulp Fiction', year: 1994 },
  { title: 'The Dark Knight', year: 2008 },
  { title: 'Interstellar', year: 2014 },
  { title: 'Parasite', year: 2019 },
  { title: 'The Godfather', year: 1972 },
  { title: 'Avengers: Endgame', year: 2019 },
  { title: 'Dune', year: 2021 },
  { title: 'Everything Everywhere All at Once', year: 2022 },
  { title: 'Top Gun: Maverick', year: 2022 },
  { title: 'The Shawshank Redemption', year: 1994 },
  { title: 'Forrest Gump', year: 1994 },
  { title: 'The Lord of the Rings: The Return of the King', year: 2003 },
  { title: 'Oppenheimer', year: 2023 },
  { title: 'Barbie', year: 2023 },
  { title: 'Spider-Man: No Way Home', year: 2021 },
  { title: 'Black Panther', year: 2018 },
  { title: 'La La Land', year: 2016 },
  { title: 'Moonlight', year: 2016 },
  { title: 'Mad Max: Fury Road', year: 2015 },
  { title: 'The Grand Budapest Hotel', year: 2014 },
  { title: 'Her', year: 2013 },
  { title: 'Blade Runner 2049', year: 2017 },
  { title: 'The Shape of Water', year: 2017 },
  { title: 'Nomadland', year: 2020 },
  { title: 'CODA', year: 2021 },
  { title: 'Green Book', year: 2018 },
  { title: 'Birdman', year: 2014 },
  { title: '12 Years a Slave', year: 2013 },
];

// Create some tags for testing
const testTags = [
  { name: 'Calen', color: '#3b82f6', icon: 'Users' },
  { name: 'Solo', color: '#8b5cf6', icon: 'User' },
  { name: 'Family', color: '#10b981', icon: 'Home' },
  { name: 'Date Night', color: '#f59e0b', icon: 'Heart' },
  { name: 'Rewatch', color: '#ef4444', icon: 'RotateCcw' },
];

// Sample Oscar data for some movies
const oscarData = [
  { title: 'Parasite', year: 2019, awards: [
    { category: 'Best Picture', type: 'won' },
    { category: 'Best Director', type: 'won' },
    { category: 'Best Original Screenplay', type: 'won' },
  ]},
  { title: 'Everything Everywhere All at Once', year: 2022, awards: [
    { category: 'Best Picture', type: 'won' },
    { category: 'Best Actress', type: 'won' },
    { category: 'Best Supporting Actor', type: 'won' },
  ]},
  { title: 'Oppenheimer', year: 2023, awards: [
    { category: 'Best Picture', type: 'won' },
    { category: 'Best Director', type: 'won' },
    { category: 'Best Actor', type: 'won' },
  ]},
  { title: 'The Shape of Water', year: 2017, awards: [
    { category: 'Best Picture', type: 'won' },
    { category: 'Best Director', type: 'won' },
  ]},
  { title: 'Moonlight', year: 2016, awards: [
    { category: 'Best Picture', type: 'won' },
    { category: 'Best Supporting Actor', type: 'won' },
  ]},
  { title: 'La La Land', year: 2016, awards: [
    { category: 'Best Director', type: 'won' },
    { category: 'Best Original Song', type: 'won' },
    { category: 'Best Picture', type: 'nominated' },
  ]},
];

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomRating(): number {
  return Math.floor(Math.random() * 10) + 1;
}

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function main() {
  console.log('🎬 Starting to seed the database with test movies...');

  // Clear existing data
  await prisma.movieTag.deleteMany({});
  await prisma.oscarData.deleteMany({});
  await prisma.userMovie.deleteMany({});
  await prisma.movie.deleteMany({});
  await prisma.tag.deleteMany({});

  // Create tags
  console.log('🏷️  Creating tags...');
  const createdTags = await Promise.all(
    testTags.map(tag =>
      prisma.tag.create({ data: tag })
    )
  );

  console.log('🔍 Fetching movies from TMDB...');
  let successCount = 0;

  for (const testMovie of testMovies) {
    try {
      console.log(`Fetching: ${testMovie.title} (${testMovie.year})`);

      const searchResult = await tmdb.searchMovieWithDetails(testMovie.title, testMovie.year);

      if (!searchResult) {
        console.log(`❌ Could not find: ${testMovie.title}`);
        continue;
      }

      const { movie, director } = searchResult;

      // Create movie record
      const createdMovie = await prisma.movie.create({
        data: {
          tmdb_id: movie.id,
          title: movie.title,
          release_date: movie.release_date ? new Date(movie.release_date) : null,
          director: director,
          overview: movie.overview,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          runtime: movie.runtime,
          genres: movie.genres,
          imdb_id: movie.imdb_id,
          imdb_rating: movie.vote_average,
        },
      });

      // Create user movie record (personal tracking)
      const watchDate = getRandomDate(new Date(2020, 0, 1), new Date());
      const personalRating = getRandomRating();

      await prisma.userMovie.create({
        data: {
          movie_id: createdMovie.id,
          date_watched: watchDate,
          personal_rating: personalRating,
          notes: `Great ${movie.genres?.[0]?.name || 'movie'}! ${personalRating >= 8 ? 'Loved it!' : personalRating >= 6 ? 'Really enjoyed it.' : 'It was okay.'}`,
          is_favorite: personalRating >= 9,
        },
      });

      // Add random tags (some movies watched with Calen, some solo, etc.)
      const randomTags = getRandomItems(createdTags, Math.floor(Math.random() * 3) + 1);

      // Ensure some movies have "Calen" tag
      if (successCount % 3 === 0) {
        const calenTag = createdTags.find(tag => tag.name === 'Calen');
        if (calenTag && !randomTags.includes(calenTag)) {
          randomTags.push(calenTag);
        }
      }

      for (const tag of randomTags) {
        await prisma.movieTag.create({
          data: {
            movie_id: createdMovie.id,
            tag_id: tag.id,
          },
        });
      }

      // Add Oscar data if available
      const oscarInfo = oscarData.find(o => o.title === movie.title && o.year.toString() === movie.release_date?.substring(0, 4));
      if (oscarInfo) {
        for (const award of oscarInfo.awards) {
          await prisma.oscarData.create({
            data: {
              movie_id: createdMovie.id,
              ceremony_year: oscarInfo.year + 1, // Usually next year
              category: award.category,
              nomination_type: award.type,
            },
          });
        }
      }

      successCount++;
      console.log(`✅ Added: ${movie.title} (${personalRating}/10)`);

      // Rate limit - TMDB allows 40 requests per 10 seconds
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.error(`❌ Error processing ${testMovie.title}:`, error);
    }
  }

  console.log(`🎉 Successfully seeded database with ${successCount} movies!`);
  console.log(`📊 Database summary:`);

  const movieCount = await prisma.movie.count();
  const userMovieCount = await prisma.userMovie.count();
  const tagCount = await prisma.tag.count();
  const oscarCount = await prisma.oscarData.count();
  const calenMovies = await prisma.movieTag.count({
    where: {
      tag: { name: 'Calen' }
    }
  });

  console.log(`   Movies: ${movieCount}`);
  console.log(`   Personal records: ${userMovieCount}`);
  console.log(`   Tags: ${tagCount}`);
  console.log(`   Oscar records: ${oscarCount}`);
  console.log(`   Movies with Calen: ${calenMovies}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });