import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function test() {
  try {
    console.log('Testing Railway database query...\n');

    // Test 1: Count all movies
    const totalMovies = await db.movie.count();
    console.log(`Total movies: ${totalMovies}`);

    // Test 2: Count approved movies
    const approvedMovies = await db.movie.count({
      where: { approval_status: 'approved' }
    });
    console.log(`Approved movies: ${approvedMovies}`);

    // Test 3: Try the actual query from the API
    const movies = await db.movie.findMany({
      where: { approval_status: 'approved' },
      include: {
        user_movies: {
          take: 1,
          orderBy: { date_watched: 'desc' }
        },
        oscar_data: true,
        movie_tags: {
          include: { tag: true }
        }
      },
      take: 20,
      skip: 0,
      orderBy: {
        user_movies: {
          _count: 'desc'
        }
      }
    });

    console.log(`\nQuery returned ${movies.length} movies`);
    console.log('First movie:', movies[0]?.title);
    console.log('\n✅ Database queries work!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

test();
