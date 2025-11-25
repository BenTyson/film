-- Migration: Add user_movies indexes and unique constraint
-- Date: 2025-11-25
-- Context: Schema optimization for query performance and data integrity
-- Status: PENDING - Not yet applied to production

-- WARNING: Test on staging first!
-- The unique constraint will fail if duplicate user-movie records exist

BEGIN;

-- Add unique constraint to prevent duplicate user-movie records
-- This enforces that a user can only have one record per movie
ALTER TABLE user_movies
  ADD CONSTRAINT user_movies_user_id_movie_id_key
  UNIQUE (user_id, movie_id);

-- Add index on movie_id for faster reverse lookups
-- Improves performance when finding all users who watched a specific movie
CREATE INDEX user_movies_movie_id_idx ON user_movies(movie_id);

-- Add index on date_watched for efficient sorting/filtering
-- Improves performance for "recently watched" queries
CREATE INDEX user_movies_date_watched_idx ON user_movies(date_watched);

COMMIT;

-- Verification queries (run after migration):
-- 1. Check for existing duplicates (run BEFORE migration):
-- SELECT user_id, movie_id, COUNT(*)
-- FROM user_movies
-- GROUP BY user_id, movie_id
-- HAVING COUNT(*) > 1;

-- 2. Verify indexes were created:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'user_movies';

-- Rollback (if needed):
-- BEGIN;
-- DROP INDEX IF EXISTS user_movies_movie_id_idx;
-- DROP INDEX IF EXISTS user_movies_date_watched_idx;
-- ALTER TABLE user_movies DROP CONSTRAINT IF EXISTS user_movies_user_id_movie_id_key;
-- COMMIT;
