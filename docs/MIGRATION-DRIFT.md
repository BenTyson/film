# Migration Drift Issue (November 2025)

## Problem
Prisma migration history is out of sync with the production database:

- **Local migrations**: Only `20251018_initial_postgresql_with_auth` exists
- **Database expects**: `20250916215312_init`, `20250917025536_add_tmdb_fields`, `20250917224147_add_csv_tracking`
- **Drift**: Production has tables/columns not tracked in migration files (activity_logs, error_logs, vaults, vault_movies, etc.)

## Root Cause
Migration files were not committed when schema changes were made to production. The `_prisma_migrations` table in the database has entries for migrations that don't exist in our local repository.

## Impact
- Cannot create new migrations using `prisma migrate dev`
- Prisma blocks all migrations until drift is resolved
- Options: Reset database (loses data) or work around

## Pending Schema Changes
The codebase schema includes optimizations not yet applied to production:

**File**: `scripts/migrations/add-user-movies-indexes.sql`

Before applying:

```sql
-- Check for duplicates first!
SELECT user_id, movie_id, COUNT(*)
FROM user_movies
GROUP BY user_id, movie_id
HAVING COUNT(*) > 1;
```

If no duplicates exist, apply: `scripts/migrations/add-user-movies-indexes.sql`

## Resolution Plan
1. **Short-term**: Use manual SQL for schema changes, update Prisma schema to match
2. **Medium-term**: Create baseline migration capturing current production state
3. **Long-term**:
   - Clean up `_prisma_migrations` table
   - Regenerate migration history from scratch
   - Or: Use `prisma db push` for development (skips migration history)

## Prevention
- **Always commit migration files** with schema changes
- Run `git status` before deploying to check for uncommitted migrations
- Consider using `--create-only` flag to review migrations before applying
- Add pre-commit hook to verify migrations are tracked

## Reference
- Prisma docs: https://www.prisma.io/docs/concepts/components/prisma-migrate/migrate-development-production#resolve-migration-history-issues
- Related commit: 3d657bf (comprehensive testing infrastructure)
