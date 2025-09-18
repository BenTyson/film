-- AlterTable
ALTER TABLE "movies" ADD COLUMN "budget" INTEGER;
ALTER TABLE "movies" ADD COLUMN "original_title" TEXT;
ALTER TABLE "movies" ADD COLUMN "popularity" REAL;
ALTER TABLE "movies" ADD COLUMN "revenue" INTEGER;
ALTER TABLE "movies" ADD COLUMN "tagline" TEXT;
ALTER TABLE "movies" ADD COLUMN "vote_average" REAL;
ALTER TABLE "movies" ADD COLUMN "vote_count" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_movies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movie_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL DEFAULT 1,
    "date_watched" DATETIME,
    "personal_rating" INTEGER,
    "notes" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "buddy_watched_with" TEXT,
    "watch_location" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_movies_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_movies" ("created_at", "date_watched", "id", "is_favorite", "movie_id", "notes", "personal_rating", "updated_at", "watch_location") SELECT "created_at", "date_watched", "id", "is_favorite", "movie_id", "notes", "personal_rating", "updated_at", "watch_location" FROM "user_movies";
DROP TABLE "user_movies";
ALTER TABLE "new_user_movies" RENAME TO "user_movies";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
