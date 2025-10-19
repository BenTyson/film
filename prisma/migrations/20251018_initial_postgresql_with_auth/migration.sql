-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."movies" (
    "id" SERIAL NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "original_title" TEXT,
    "release_date" TIMESTAMP(3),
    "director" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "runtime" INTEGER,
    "genres" JSONB,
    "vote_average" DOUBLE PRECISION,
    "vote_count" INTEGER,
    "popularity" DOUBLE PRECISION,
    "budget" BIGINT,
    "revenue" BIGINT,
    "tagline" TEXT,
    "imdb_id" TEXT,
    "imdb_rating" DOUBLE PRECISION,
    "csv_row_number" INTEGER,
    "csv_title" TEXT,
    "csv_director" TEXT,
    "csv_year" TEXT,
    "csv_notes" TEXT,
    "approval_status" TEXT NOT NULL DEFAULT 'pending',
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_movies" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date_watched" TIMESTAMP(3),
    "personal_rating" INTEGER,
    "notes" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "buddy_watched_with" TEXT,
    "watch_location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oscar_data" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "ceremony_year" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,
    "nominee_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oscar_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_tags" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movie_match_analysis" (
    "id" SERIAL NOT NULL,
    "movie_id" INTEGER NOT NULL,
    "confidence_score" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "mismatches" JSONB NOT NULL,
    "title_similarity" INTEGER,
    "director_similarity" INTEGER,
    "year_difference" INTEGER,
    "analysis_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movie_match_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."best_picture_nominees" (
    "id" SERIAL NOT NULL,
    "tmdb_id" INTEGER,
    "ceremony_year" INTEGER NOT NULL,
    "movie_title" TEXT NOT NULL,
    "release_year" INTEGER,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "director" TEXT,

    CONSTRAINT "best_picture_nominees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oscar_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category_group" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oscar_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oscar_movies" (
    "id" SERIAL NOT NULL,
    "tmdb_id" INTEGER,
    "imdb_id" TEXT,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oscar_movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oscar_nominations" (
    "id" SERIAL NOT NULL,
    "ceremony_year" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "movie_id" INTEGER,
    "nominee_name" TEXT,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oscar_nominations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."watchlist_movies" (
    "id" SERIAL NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "director" TEXT,
    "release_date" TIMESTAMP(3),
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "overview" TEXT,
    "runtime" INTEGER,
    "genres" JSONB,
    "vote_average" DOUBLE PRECISION,
    "imdb_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlist_movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."watchlist_tags" (
    "id" SERIAL NOT NULL,
    "watchlist_movie_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "movies_tmdb_id_key" ON "public"."movies"("tmdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "public"."users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "user_movies_user_id_idx" ON "public"."user_movies"("user_id");

-- CreateIndex
CREATE INDEX "oscar_data_movie_id_idx" ON "public"."oscar_data"("movie_id");

-- CreateIndex
CREATE INDEX "oscar_data_ceremony_year_idx" ON "public"."oscar_data"("ceremony_year");

-- CreateIndex
CREATE UNIQUE INDEX "oscar_data_movie_id_ceremony_year_category_key" ON "public"."oscar_data"("movie_id", "ceremony_year", "category");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "public"."tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "movie_tags_movie_id_tag_id_key" ON "public"."movie_tags"("movie_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "movie_match_analysis_movie_id_key" ON "public"."movie_match_analysis"("movie_id");

-- CreateIndex
CREATE UNIQUE INDEX "best_picture_nominees_ceremony_year_movie_title_key" ON "public"."best_picture_nominees"("ceremony_year", "movie_title");

-- CreateIndex
CREATE UNIQUE INDEX "oscar_categories_name_key" ON "public"."oscar_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "oscar_movies_tmdb_id_key" ON "public"."oscar_movies"("tmdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "oscar_movies_imdb_id_key" ON "public"."oscar_movies"("imdb_id");

-- CreateIndex
CREATE INDEX "oscar_nominations_ceremony_year_idx" ON "public"."oscar_nominations"("ceremony_year");

-- CreateIndex
CREATE INDEX "oscar_nominations_category_id_idx" ON "public"."oscar_nominations"("category_id");

-- CreateIndex
CREATE INDEX "oscar_nominations_movie_id_idx" ON "public"."oscar_nominations"("movie_id");

-- CreateIndex
CREATE INDEX "watchlist_movies_user_id_idx" ON "public"."watchlist_movies"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_movies_tmdb_id_user_id_key" ON "public"."watchlist_movies"("tmdb_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_tags_watchlist_movie_id_tag_id_key" ON "public"."watchlist_tags"("watchlist_movie_id", "tag_id");

-- AddForeignKey
ALTER TABLE "public"."user_movies" ADD CONSTRAINT "user_movies_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_movies" ADD CONSTRAINT "user_movies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oscar_data" ADD CONSTRAINT "oscar_data_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_tags" ADD CONSTRAINT "movie_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_tags" ADD CONSTRAINT "movie_tags_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movie_match_analysis" ADD CONSTRAINT "movie_match_analysis_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oscar_nominations" ADD CONSTRAINT "oscar_nominations_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."oscar_movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oscar_nominations" ADD CONSTRAINT "oscar_nominations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."oscar_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."watchlist_movies" ADD CONSTRAINT "watchlist_movies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."watchlist_tags" ADD CONSTRAINT "watchlist_tags_watchlist_movie_id_fkey" FOREIGN KEY ("watchlist_movie_id") REFERENCES "public"."watchlist_movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."watchlist_tags" ADD CONSTRAINT "watchlist_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

