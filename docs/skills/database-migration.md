# Database Migration Skill

Guide for creating and managing database schema changes with Prisma.

## Creating Migrations

### 1. Edit Schema

Modify `prisma/schema.prisma`:

```prisma
// Example: Add new field to existing model
model Movie {
  // ... existing fields
  trailer_url String? // Add new optional field
}

// Example: Add new model
model Collection {
  id         Int      @id @default(autoincrement())
  name       String
  user_id    Int      @default(1)
  created_at DateTime @default(now())
  movies     CollectionMovie[]

  @@map("collections")
}

model CollectionMovie {
  id            Int        @id @default(autoincrement())
  collection_id Int
  movie_id      Int
  created_at    DateTime   @default(now())
  collection    Collection @relation(fields: [collection_id], references: [id])
  movie         Movie      @relation(fields: [movie_id], references: [id])

  @@unique([collection_id, movie_id])
  @@map("collection_movies")
}
```

---

### 2. Create Migration

```bash
npx prisma migrate dev --name descriptive_migration_name
```

**Naming conventions:**
- `add_trailer_url_to_movies` - Adding field
- `create_collections` - New table
- `add_index_to_movies_release_date` - Index changes
- `rename_buddy_to_tag` - Schema refactoring

**What happens:**
1. Prisma analyzes schema changes
2. Generates SQL migration file in `prisma/migrations/`
3. Applies migration to development database
4. Regenerates Prisma Client

---

### 3. Review Migration SQL

Check `prisma/migrations/[timestamp]_descriptive_migration_name/migration.sql`:

```sql
-- Example: Add field migration
ALTER TABLE "movies" ADD COLUMN "trailer_url" TEXT;

-- Example: Create table migration
CREATE TABLE "collections" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- Example: Add index
CREATE INDEX "idx_movies_release_date" ON "movies"("release_date");
```

**Verify:**
- SQL is correct for PostgreSQL
- No unintended changes
- Foreign keys are properly defined
- Indexes are appropriate

---

### 4. Generate Client

If not auto-generated:

```bash
npx prisma generate
```

This updates the Prisma Client with new types and methods.

---

### 5. Update TypeScript Types

Update relevant TypeScript interfaces in `src/types/`:

```typescript
// src/types/movie.ts
export interface Movie {
  id: number;
  tmdb_id: number;
  title: string;
  // ... existing fields
  trailer_url: string | null; // Add new field
}

// src/types/collection.ts (new file)
export interface Collection {
  id: number;
  name: string;
  user_id: number;
  created_at: Date;
}

export interface CollectionMovie {
  id: number;
  collection_id: number;
  movie_id: number;
  created_at: Date;
}

export interface CollectionWithMovies extends Collection {
  movies: CollectionMovie[];
}
```

---

## Common Migration Patterns

### Add Column

```prisma
model Movie {
  // existing fields
  new_field String? // Add new optional field
}
```

**Optional vs Required:**
- Use `String?` for optional (allows NULL)
- Use `String @default("value")` for required with default
- Avoid adding required fields without defaults (breaks existing data)

---

### Add Table with Relationship

```prisma
model Review {
  id         Int      @id @default(autoincrement())
  movie_id   Int
  rating     Int
  comment    String?
  created_at DateTime @default(now())

  movie Movie @relation(fields: [movie_id], references: [id], onDelete: Cascade)

  @@map("reviews")
}

model Movie {
  // existing fields
  reviews Review[] // Add relation
}
```

**Relationship patterns:**
- `onDelete: Cascade` - Delete reviews when movie deleted
- `onDelete: SetNull` - Set foreign key to NULL
- `onDelete: Restrict` - Prevent deletion if related records exist

---

### Add Index

```prisma
model Movie {
  // fields

  @@index([release_date]) // Simple index
  @@index([release_date, title]) // Composite index
  @@unique([tmdb_id]) // Unique constraint
}
```

**When to add indexes:**
- Frequently filtered fields (WHERE clauses)
- Sort/order by fields
- Foreign keys (usually auto-indexed)
- Unique constraints for data integrity

---

### Rename Field

```prisma
model Movie {
  // OLD: buddy_watched_with String?
  watched_with String? @map("buddy_watched_with") // Rename in schema, map to old column
}
```

**Or with migration:**
```sql
ALTER TABLE "movies" RENAME COLUMN "buddy_watched_with" TO "watched_with";
```

---

### Change Field Type

```prisma
model Movie {
  // OLD: runtime String?
  runtime Int? // Change to integer
}
```

**⚠️ WARNING:** Data conversion required! May need custom migration:

```sql
-- Convert string to integer
UPDATE "movies" SET runtime = CAST(runtime AS INTEGER) WHERE runtime ~ '^[0-9]+$';
ALTER TABLE "movies" ALTER COLUMN "runtime" TYPE INTEGER USING runtime::integer;
```

---

### Add Enum

```prisma
enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}

model Movie {
  approval_status ApprovalStatus @default(PENDING)
}
```

---

## Production Deployment

### Railway Deployment

Railway runs migrations automatically on deploy:

```bash
# package.json
"scripts": {
  "build": "prisma generate && next build"
}
```

Railway runs:
```bash
npx prisma migrate deploy
```

**`migrate deploy` vs `migrate dev`:**
- `migrate dev` - Development, creates migrations
- `migrate deploy` - Production, applies existing migrations only

---

### Manual Production Migration

If needed:

```bash
# 1. Backup database first!
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Run migration
npx prisma migrate deploy

# 3. Verify
npx prisma db ping
```

---

## Rollback Strategies

**Prisma migrations are forward-only.** No built-in rollback.

### Option 1: Restore from Backup

```bash
# Restore database from backup
psql $DATABASE_URL < backup_20241018.sql
```

### Option 2: Create Reverse Migration

```bash
# Create new migration that reverses changes
npx prisma migrate dev --name revert_previous_change

# Edit migration SQL to reverse changes
# Example: DROP COLUMN instead of ADD COLUMN
```

---

## Data Migrations

For complex data transformations, create custom scripts:

```typescript
// scripts/migrate-data.ts
import { prisma } from '../src/lib/prisma';

async function migrateMovieGenres() {
  const movies = await prisma.movie.findMany();

  for (const movie of movies) {
    // Transform data
    const genres = transformGenres(movie.genres);

    await prisma.movie.update({
      where: { id: movie.id },
      data: { genres }
    });
  }

  console.log(`Migrated ${movies.length} movies`);
}

migrateMovieGenres()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run before deploying:
```bash
npx tsx scripts/migrate-data.ts
```

---

## Troubleshooting

### Migration Failed

```bash
# Check migration status
npx prisma migrate status

# Resolve migration issues
npx prisma migrate resolve --applied "20241018_migration_name"
npx prisma migrate resolve --rolled-back "20241018_migration_name"

# Reset database (DEVELOPMENT ONLY - DELETES ALL DATA)
npx prisma migrate reset
```

### Schema Drift

When database doesn't match schema:

```bash
# Check for drift
npx prisma migrate diff

# Push schema changes directly (skip migrations)
npx prisma db push

# ⚠️ Use db push for:
# - Prototyping
# - Development
# NOT for production
```

### Type Errors After Migration

```bash
# Regenerate Prisma Client
npx prisma generate

# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

---

## Best Practices

### ✅ DO:
- Always backup database before production migrations
- Use descriptive migration names
- Review generated SQL before applying
- Test migrations on development database first
- Keep migrations small and focused
- Add indexes for performance-critical queries

### ❌ DON'T:
- Don't edit migration files after they're applied
- Don't add required fields without defaults to existing tables
- Don't skip migrations in production
- Don't use `db push` in production
- Don't delete migration files
- Don't change field types without data migration plan

---

## Examples from Film Project

### Adding Watchlist Tables (October 2024)

```prisma
model WatchlistMovie {
  id            Int            @id @default(autoincrement())
  tmdb_id       Int            @unique
  title         String
  director      String?
  release_date  DateTime?
  poster_path   String?
  created_at    DateTime       @default(now())
  updated_at    DateTime       @updatedAt
  tags          WatchlistTag[]

  @@map("watchlist_movies")
}

model WatchlistTag {
  id                 Int            @id @default(autoincrement())
  watchlist_movie_id Int
  tag_id             Int
  created_at         DateTime       @default(now())
  watchlist_movie    WatchlistMovie @relation(fields: [watchlist_movie_id], references: [id])
  tag                Tag            @relation(fields: [tag_id], references: [id])

  @@unique([watchlist_movie_id, tag_id])
  @@map("watchlist_tags")
}
```

Migration:
```bash
npx prisma migrate dev --name add_watchlist_feature
```

---

## Related Documentation

- **Add Feature:** [add-feature.md](./add-feature.md) - Full feature development workflow
- **Architecture:** [../architecture.md](../architecture.md) - Database schema overview
- **Process:** [../process.md](../process.md#database-management) - Database management workflows
- **Quick Start:** [../session-start/QUICK-START.md](../session-start/QUICK-START.md)
