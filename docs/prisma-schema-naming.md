# Prisma Schema Naming Convention

**Last Updated:** January 2025

## Overview

The Prisma schema uses **snake_case** naming for all model names to match PostgreSQL table naming conventions. This document clarifies the correct naming patterns for accessing models through the Prisma client.

## Model Names Reference

### Correct Prisma Client Usage

All Prisma models use snake_case names:

```typescript
// User & Authentication
prisma.users              // NOT prisma.user
prisma.activity_logs      // NOT prisma.activityLog
prisma.error_logs         // NOT prisma.errorLog

// Movies & Collections
prisma.movies             // NOT prisma.movie
prisma.user_movies        // NOT prisma.userMovie

// Tags & Organization
prisma.tags               // NOT prisma.tag
prisma.movie_tags         // NOT prisma.movieTag

// Oscar System
prisma.oscar_categories   // NOT prisma.oscarCategories
prisma.oscar_movies       // NOT prisma.oscarMovies
prisma.oscar_nominations  // NOT prisma.oscarNominations
prisma.oscar_data         // NOT prisma.oscarData (DEPRECATED)

// Watchlist
prisma.watchlist_movies   // NOT prisma.watchlistMovies
prisma.watchlist_tags     // NOT prisma.watchlistTags

// Vaults
prisma.vaults             // NOT prisma.vault
prisma.vault_movies       // NOT prisma.vaultMovies

// Legacy/Other
prisma.best_picture_nominees  // NOT prisma.bestPictureNominees
prisma.movie_match_analysis   // NOT prisma.movieMatchAnalysis
```

## Relation Names in Includes

When using Prisma's `include` option, relation names also follow snake_case:

```typescript
// ✅ Correct
const movie = await prisma.movies.findUnique({
  where: { id: 1 },
  include: {
    user_movies: true,           // NOT user_movie
    movie_tags: {                // NOT movieTags
      include: {
        tags: true               // NOT tag
      }
    },
    oscar_data: true             // NOT oscarData
  }
});

// ✅ Correct - Oscar nominations
const nomination = await prisma.oscar_nominations.findMany({
  include: {
    oscar_movies: true,          // NOT movie
    oscar_categories: true       // NOT category
  }
});

// ✅ Correct - User movies
const userMovie = await prisma.user_movies.findFirst({
  include: {
    movies: true,                // NOT movie
    users: true                  // NOT user
  }
});
```

## Required Fields

All Prisma create/update operations require the `updated_at` field:

```typescript
// ✅ Correct - Always include updated_at
await prisma.movies.create({
  data: {
    tmdb_id: 872,
    title: "Oppenheimer",
    // ... other fields
    updated_at: new Date()       // REQUIRED
  }
});

await prisma.user_movies.upsert({
  where: { id: 1 },
  create: {
    movie_id: 1,
    user_id: 1,
    updated_at: new Date()       // REQUIRED
  },
  update: {
    personal_rating: 9,
    updated_at: new Date()       // REQUIRED
  }
});
```

## Common Patterns

### Filtering by User

```typescript
const user = await getCurrentUser();

// Get user's movies
const movies = await prisma.movies.findMany({
  where: {
    user_movies: {
      some: { user_id: user.id }
    }
  }
});

// Get user's watchlist
const watchlist = await prisma.watchlist_movies.findMany({
  where: { user_id: user.id }
});
```

### Transaction Contexts

In Prisma transactions, model names remain snake_case:

```typescript
await prisma.$transaction(async (tx) => {
  const movie = await tx.movies.create({ /* ... */ });
  await tx.user_movies.create({ /* ... */ });
  await tx.movie_tags.createMany({ /* ... */ });
});
```

## TypeScript Type Names

TypeScript types from Prisma Client use PascalCase:

```typescript
import { Prisma } from '@prisma/client';

// Type references
type UserMovie = Prisma.user_moviesGetPayload<{}>;
type Movie = Prisma.moviesGetPayload<{}>;
type OscarNomination = Prisma.oscar_nominationsGetPayload<{}>;

// Where input types
const where: Prisma.moviesWhereInput = {
  tmdb_id: 872
};

const oscarWhere: Prisma.oscar_nominationsWhereInput = {
  ceremony_year: 2024
};
```

## Migration Notes (January 2025)

In January 2025, the entire codebase was updated to use correct snake_case Prisma model names. This affected:

- **70+ files** across API routes, scripts, and components
- **Model names**: Changed from camelCase to snake_case
- **Relation names**: Updated in all `include` and `where` clauses
- **Property accesses**: Updated nested property access throughout
- **Missing fields**: Added `updated_at` to 30+ create/upsert operations

**Files Updated:**
- Seed files (2)
- Scripts (10+)
- API routes (40+): movies, admin, import, oscars, search, vaults, watchlist, webhooks
- Library files: auth.ts

## Verification

To verify your code follows the correct naming convention:

```bash
# TypeScript build should pass
npm run build

# Check for old naming patterns (should return no results)
grep -r "prisma\.user\." src/
grep -r "prisma\.movie\." src/
grep -r "prisma\.userMovie" src/
grep -r "prisma\.movieTag" src/
```

## Related Documentation

- **Architecture:** [architecture.md](./architecture.md) - System architecture and database schema
- **Process:** [process.md](./process.md) - Development workflows and deployment
