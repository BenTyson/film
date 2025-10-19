# TMDB Integration Skill

Guide for working with The Movie Database (TMDB) API in the Film app.

## TMDB Client Overview

The app uses a centralized TMDB client (`/src/lib/tmdb.ts`) for all TMDB operations.

**Base URL:** `https://api.themoviedb.org/3`
**Rate Limit:** 40 requests per 10 seconds
**Authentication:** API key in environment variable `TMDB_API_KEY`

---

## Using the TMDB Client

### Import

```typescript
import { searchMovies, getMovieDetails, getMovieCredits } from '@/lib/tmdb';
```

---

### Search Movies

```typescript
const results = await searchMovies('Oppenheimer', 2023);

// Response type
interface TMDBSearchResponse {
  page: number;
  results: TMDBMovie[];
  total_results: number;
  total_pages: number;
}

interface TMDBMovie {
  id: number; // TMDB ID
  title: string;
  original_title: string;
  release_date: string; // YYYY-MM-DD
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
}
```

**Usage:**
```typescript
const searchResults = await searchMovies('The Matrix');

if (searchResults.results.length > 0) {
  const firstResult = searchResults.results[0];
  console.log(`Found: ${firstResult.title} (${firstResult.release_date})`);
  console.log(`TMDB ID: ${firstResult.id}`);
}
```

**With year filtering:**
```typescript
// More accurate results when you know the release year
const results = await searchMovies('The Batman', 2022);
```

---

### Get Movie Details

```typescript
const movie = await getMovieDetails(872585); // Oppenheimer TMDB ID

// Response includes:
interface TMDBMovieDetails {
  id: number;
  title: string;
  original_title: string;
  tagline: string;
  overview: string;
  release_date: string;
  runtime: number; // minutes
  budget: number;
  revenue: number;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: { id: number; name: string }[];
  production_companies: { id: number; name: string }[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  imdb_id: string | null;
  status: string; // "Released", "Post Production", etc.
}
```

**Usage:**
```typescript
const movie = await getMovieDetails(872585);

console.log(`Title: ${movie.title}`);
console.log(`Runtime: ${movie.runtime} minutes`);
console.log(`Director: ${movie.credits?.crew.find(c => c.job === 'Director')?.name}`);
console.log(`Genres: ${movie.genres.map(g => g.name).join(', ')}`);
```

---

### Get Movie Credits

```typescript
const credits = await getMovieCredits(872585);

interface TMDBCredits {
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];
  crew: {
    id: number;
    name: string;
    job: string; // "Director", "Writer", "Producer", etc.
    department: string;
    profile_path: string | null;
  }[];
}
```

**Usage:**
```typescript
const credits = await getMovieCredits(872585);

// Get director
const director = credits.crew.find(c => c.job === 'Director');
console.log(`Director: ${director?.name}`);

// Get top 3 cast members
const topCast = credits.cast.slice(0, 3);
topCast.forEach(actor => {
  console.log(`${actor.name} as ${actor.character}`);
});
```

---

## Internal API Endpoints

For client-side code, use the internal TMDB proxy endpoints instead of calling TMDB directly.

### `/api/tmdb/search` - Search Movies

```typescript
const response = await fetch(`/api/tmdb/search?query=${encodeURIComponent('Oppenheimer')}&year=2023`);
const data = await response.json();

// Response:
{
  success: boolean;
  data: TMDBSearchResponse;
  error?: string;
}
```

---

### `/api/tmdb/movie/[id]` - Get Movie Details

```typescript
const response = await fetch(`/api/tmdb/movie/872585`);
const data = await response.json();

// Response:
{
  success: boolean;
  data: TMDBMovieDetails;
  error?: string;
}
```

**Why use internal API?**
- Consistent error handling
- Rate limiting management
- Unified response format
- Server-side API key protection

---

## Poster Path Resolution

TMDB returns poster paths as `/abc123.jpg`. You need to construct the full URL.

### Standard Pattern

```typescript
const posterPath = '/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg'; // From TMDB

// Construct full URL
const posterUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
```

**Image sizes available:**
- `w92` - Tiny thumbnail
- `w154` - Small thumbnail
- `w185` - Medium thumbnail
- `w342` - Large thumbnail
- `w500` - Standard poster (recommended for grids)
- `w780` - Large poster
- `original` - Original resolution (very large)

### Pattern in Components

```typescript
import Image from 'next/image';

interface MovieCardProps {
  posterPath: string | null;
  title: string;
}

export function MovieCard({ posterPath, title }: MovieCardProps) {
  const posterUrl = posterPath
    ? `https://image.tmdb.org/t/p/w500${posterPath}`
    : '/placeholder-poster.jpg'; // Fallback

  return (
    <Image
      src={posterUrl}
      alt={title}
      width={500}
      height={750}
      className="rounded-lg"
    />
  );
}
```

---

## Rate Limiting

TMDB enforces **40 requests per 10 seconds**.

### For Bulk Operations

Add delays between requests:

```typescript
async function fetchMultipleMovies(tmdbIds: number[]) {
  const movies = [];

  for (let i = 0; i < tmdbIds.length; i++) {
    const movie = await getMovieDetails(tmdbIds[i]);
    movies.push(movie);

    // Add delay every 30 requests
    if ((i + 1) % 30 === 0) {
      console.log(`Processed ${i + 1}/${tmdbIds.length}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 11000)); // 11 seconds
    }
  }

  return movies;
}
```

### Exponential Backoff

For rate limit errors (429):

```typescript
async function fetchWithRetry(tmdbId: number, retries = 3): Promise<TMDBMovieDetails> {
  try {
    return await getMovieDetails(tmdbId);
  } catch (error: any) {
    if (error.status === 429 && retries > 0) {
      const waitTime = (4 - retries) * 5000; // 5s, 10s, 15s
      console.log(`Rate limited, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchWithRetry(tmdbId, retries - 1);
    }
    throw error;
  }
}
```

---

## Error Handling

```typescript
try {
  const movie = await getMovieDetails(tmdbId);
} catch (error: any) {
  if (error.status === 404) {
    console.error('Movie not found on TMDB');
  } else if (error.status === 429) {
    console.error('Rate limited - too many requests');
  } else if (error.status === 401) {
    console.error('Invalid TMDB API key');
  } else {
    console.error('TMDB API error:', error.message);
  }
}
```

---

## Common Patterns

### Pattern 1: Search → Add to Collection

```typescript
async function addMovieToCollection(movieName: string, year?: number) {
  // 1. Search TMDB
  const searchResults = await searchMovies(movieName, year);

  if (searchResults.results.length === 0) {
    throw new Error('Movie not found on TMDB');
  }

  // 2. User selects result (or auto-select first)
  const selectedResult = searchResults.results[0];

  // 3. Get full details
  const movieDetails = await getMovieDetails(selectedResult.id);

  // 4. Get credits for director
  const credits = await getMovieCredits(selectedResult.id);
  const director = credits.crew.find(c => c.job === 'Director');

  // 5. Create database records
  const movie = await prisma.movie.create({
    data: {
      tmdb_id: movieDetails.id,
      title: movieDetails.title,
      release_date: new Date(movieDetails.release_date),
      director: director?.name,
      overview: movieDetails.overview,
      poster_path: movieDetails.poster_path,
      backdrop_path: movieDetails.backdrop_path,
      runtime: movieDetails.runtime,
      genres: movieDetails.genres,
      imdb_id: movieDetails.imdb_id
    }
  });

  return movie;
}
```

---

### Pattern 2: Poster Missing → Fetch from TMDB

```typescript
async function fixMissingPoster(movieId: number, tmdbId: number) {
  try {
    // 1. Fetch fresh data from TMDB
    const movieDetails = await getMovieDetails(tmdbId);

    if (!movieDetails.poster_path) {
      console.log('Movie has no poster on TMDB');
      return null;
    }

    // 2. Update database
    await prisma.movie.update({
      where: { id: movieId },
      data: { poster_path: movieDetails.poster_path }
    });

    console.log('Poster updated successfully');
    return movieDetails.poster_path;
  } catch (error) {
    console.error('Failed to fetch poster:', error);
    return null;
  }
}
```

---

### Pattern 3: TMDB ID Validation

```typescript
async function validateTMDBId(tmdbId: number): Promise<boolean> {
  try {
    await getMovieDetails(tmdbId);
    return true;
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    }
    throw error; // Re-throw other errors
  }
}

// Usage
const isValid = await validateTMDBId(872585);
if (!isValid) {
  console.error('Invalid TMDB ID');
}
```

---

### Pattern 4: Batch Poster Refresh

```typescript
async function refreshAllPosters() {
  const movies = await prisma.movie.findMany({
    where: {
      OR: [
        { poster_path: null },
        { poster_path: '' }
      ]
    }
  });

  console.log(`Found ${movies.length} movies without posters`);

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];

    try {
      const details = await getMovieDetails(movie.tmdb_id);

      if (details.poster_path) {
        await prisma.movie.update({
          where: { id: movie.id },
          data: { poster_path: details.poster_path }
        });
        console.log(`✅ Updated: ${movie.title}`);
      }
    } catch (error) {
      console.error(`❌ Failed: ${movie.title}`, error);
    }

    // Rate limit handling
    if ((i + 1) % 30 === 0) {
      await new Promise(resolve => setTimeout(resolve, 11000));
    }
  }
}
```

---

## Best Practices

### ✅ DO:
- Use internal `/api/tmdb/*` endpoints from client-side code
- Cache TMDB responses when possible
- Add delays for bulk operations (30 requests, wait 11s)
- Handle 404 errors gracefully (movie not found)
- Use appropriate image sizes (`w500` for posters)
- Validate TMDB IDs before using them

### ❌ DON'T:
- Don't expose TMDB API key on client-side
- Don't make 40+ requests in 10 seconds
- Don't ignore rate limit errors (429)
- Don't use `original` image size for thumbnails (too large)
- Don't assume all movies have posters/backdrops

---

## Examples from Film Project

### AddToWatchlistModal.tsx

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);

const handleSearch = async () => {
  const response = await fetch(
    `/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`
  );
  const data = await response.json();

  if (data.success) {
    setSearchResults(data.data.results);
  }
};
```

### Oscar EditOscarMovieModal.tsx

```typescript
const [tmdbId, setTmdbId] = useState(movie.tmdb_id);
const [posterPreview, setPosterPreview] = useState(movie.poster_path);

const handleTMDBIdChange = async (newTmdbId: number) => {
  try {
    // Fetch new movie data
    const response = await fetch(`/api/tmdb/movie/${newTmdbId}`);
    const data = await response.json();

    if (data.success) {
      setPosterPreview(data.data.poster_path);
    }
  } catch (error) {
    console.error('Invalid TMDB ID');
  }
};
```

---

## Related Documentation

- **Add Feature:** [add-feature.md](./add-feature.md) - Feature development workflow
- **Architecture:** [../architecture.md](../architecture.md) - API structure
- **Quick Start:** [../session-start/QUICK-START.md](../session-start/QUICK-START.md)
