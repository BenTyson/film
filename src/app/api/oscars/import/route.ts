import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface OscarNominationData {
  category: string;
  year: string;
  nominees: string[];
  movies: Array<{
    title: string;
    tmdb_id?: number;
    imdb_id?: string;
  }>;
  won: boolean;
}

function normalizeYear(year: string): number {
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

function categorizeCategory(category: string): string {
  if (category.includes('Actor') || category.includes('Actress')) return 'Acting';
  if (category.includes('Director')) return 'Directing';
  if (category.includes('Screenplay') || category.includes('Writing') || category.includes('Story')) return 'Writing';
  if (category.includes('Cinematography')) return 'Cinematography';
  if (category.includes('Editing')) return 'Editing';
  if (category.includes('Sound')) return 'Sound';
  if (category.includes('Music') || category.includes('Score') || category.includes('Song')) return 'Music';
  if (category.includes('Costume')) return 'Costume Design';
  if (category.includes('Makeup')) return 'Makeup';
  if (category.includes('Visual Effects') || category.includes('Special Effects')) return 'Visual Effects';
  if (category.includes('Production Design') || category.includes('Art Direction')) return 'Production Design';
  if (category.includes('Animated') || category.includes('Short')) return 'Short Films & Animation';
  if (category.includes('Documentary')) return 'Documentary';
  if (category.includes('International') || category.includes('Foreign')) return 'International';
  if (category === 'Best Picture') return 'Best Picture';
  return 'Technical';
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = false } = await request.json();

    console.log('Starting Oscar nominations import...');

    // Load the Oscar nominations data
    const dataPath = path.join(process.cwd(), 'src', 'data', 'oscar-nominations.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({
        success: false,
        error: 'Oscar nominations data file not found'
      }, { status: 404 });
    }

    const oscarData: OscarNominationData[] = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`Loaded ${oscarData.length} nominations from JSON file`);

    if (dryRun) {
      // Analyze data without importing
      const categories = new Set(oscarData.map(n => n.category));
      const years = new Set(oscarData.map(n => normalizeYear(n.year)));
      const movies = new Set();
      oscarData.forEach(n => n.movies.forEach(m => movies.add(m.title)));

      return NextResponse.json({
        success: true,
        analysis: {
          total_nominations: oscarData.length,
          categories: Array.from(categories).sort(),
          years: Array.from(years).sort(),
          year_range: [Math.min(...years), Math.max(...years)],
          unique_movies: movies.size,
          sample_data: oscarData.slice(0, 5)
        }
      });
    }

    // Clear existing data
    console.log('Clearing existing Oscar data...');
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

    // Create categories
    console.log('Creating categories...');
    const categoryMap = new Map<string, number>();
    const uniqueCategories = [...new Set(oscarData.map(n => n.category))];

    for (const categoryName of uniqueCategories) {
      try {
        const category = await prisma.oscarCategory.create({
          data: {
            name: categoryName,
            category_group: categorizeCategory(categoryName)
          }
        });
        categoryMap.set(categoryName, category.id);
        stats.categories_created++;
      } catch (error) {
        console.error(`Error creating category ${categoryName}:`, error);
        stats.errors++;
      }
    }

    // Create movies
    console.log('Creating movies...');
    const movieMap = new Map<string, number>();
    const uniqueMovies = new Map<string, { title: string; tmdb_id?: number; imdb_id?: string }>();

    oscarData.forEach(nomination => {
      nomination.movies.forEach(movie => {
        const key = `${movie.title}-${movie.tmdb_id || 'no-tmdb'}`;
        if (!uniqueMovies.has(key)) {
          uniqueMovies.set(key, movie);
        }
      });
    });

    for (const [key, movie] of uniqueMovies) {
      try {
        const oscarMovie = await prisma.oscarMovie.create({
          data: {
            title: movie.title,
            tmdb_id: movie.tmdb_id,
            imdb_id: movie.imdb_id
          }
        });
        movieMap.set(key, oscarMovie.id);
        stats.movies_created++;
      } catch (error) {
        console.error(`Error creating movie ${movie.title}:`, error);
        stats.errors++;
      }
    }

    // Create nominations in batches
    console.log('Creating nominations...');
    const BATCH_SIZE = 100;
    const nominationData = [];

    for (const nomination of oscarData) {
      stats.processed++;

      if (stats.processed % 1000 === 0) {
        console.log(`Processed ${stats.processed}/${oscarData.length} nominations...`);
      }

      try {
        const ceremonyYear = normalizeYear(nomination.year);
        const categoryId = categoryMap.get(nomination.category);

        if (!categoryId) {
          console.error(`Category not found: ${nomination.category}`);
          stats.errors++;
          continue;
        }

        // Handle multiple nominees
        const nominees = nomination.nominees.length > 0 ? nomination.nominees : [null];

        for (const nominee of nominees) {
          // Find movie ID if there are movies
          let movieId = null;
          if (nomination.movies.length > 0) {
            const movie = nomination.movies[0]; // Take first movie if multiple
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

          // Insert in batches
          if (nominationData.length >= BATCH_SIZE) {
            await prisma.oscarNomination.createMany({
              data: nominationData
            });
            stats.nominations_created += nominationData.length;
            nominationData.length = 0; // Clear array
          }
        }

      } catch (error) {
        console.error(`Error processing nomination:`, error);
        stats.errors++;
      }
    }

    // Insert remaining nominations
    if (nominationData.length > 0) {
      await prisma.oscarNomination.createMany({
        data: nominationData
      });
      stats.nominations_created += nominationData.length;
    }

    console.log('Import completed!');
    console.log('Stats:', stats);

    return NextResponse.json({
      success: true,
      message: 'Oscar nominations imported successfully',
      stats
    });

  } catch (error) {
    console.error('Error importing Oscar nominations:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to import Oscar nominations'
    }, { status: 500 });
  }
}