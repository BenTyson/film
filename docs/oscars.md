# Oscar Data System Documentation

**Last Updated:** January 2025

**→ For quick orientation, read [session-start/QUICK-START.md](./session-start/QUICK-START.md) first**

## ✅ Current Status: Production-Ready (January 2025)

**System State:** Automated import system with TMDB verification operational

The Oscar data system was completely rebuilt in January 2025 with automated TMDB ID verification and 99%+ auto-verification success rate. Current state:

- ✅ **1,409 unique movies** with verified TMDB IDs (100% completion)
- ✅ **2,913 nominations** across ceremony years 1929-2024
- ✅ **6 categories**: Best Picture, Best Actor, Best Actress, Best Director, Best Supporting Actor, Best Supporting Actress
- ✅ **TMDB Verification**: Automated fuzzy matching with manual review UI for edge cases
- ✅ **Incremental Import**: Safe category expansion without data loss
- 📊 **Table View**: Primary interface for browsing and validating Oscar data
- 🔍 **Review UI**: Manual verification interface at `/oscars/review` for flagged movies

**→ See [skills/oscar-tmdb-import.md](./skills/oscar-tmdb-import.md) for complete import workflow and expanding to additional categories**

## Overview

The Oscar data system is a comprehensive architecture for managing Academy Award nominations and wins data from 1928-2025. It provides a unified approach to track Oscar data, match it with the user's movie collection, and display movies with proper visual indicators (grayscale for non-collection movies).

## Database Architecture

### Three Core Oscar Tables

The system uses a **unified architecture** with three interconnected tables:

#### 1. `oscar_categories` - Category Master Data
```sql
- id: Primary key
- name: Category name (e.g., "Best Picture", "Best Actor")
- category_group: Grouping (e.g., "Best Picture", "Acting", "Technical")
- is_active: Boolean flag for current categories
- created_at, updated_at: Timestamps
```

#### 2. `oscar_movies` - Oscar-Specific Movie Records
```sql
- id: Primary key
- tmdb_id: TMDB movie ID for matching (UNIQUE)
- imdb_id: IMDb movie ID for matching (UNIQUE)
- title: Movie title
- poster_path: TMDB poster path for grid view display (String, nullable)
- review_status: Enum (pending, auto_verified, needs_manual_review, manually_reviewed)
- verification_notes: Text notes from automated verification
- confidence_score: Float (0.0-1.0) indicating title match confidence
- reviewed_at: Timestamp of manual review
- reviewed_by: User who performed manual review
- created_at, updated_at: Timestamps
```

#### 3. `oscar_nominations` - Complete Historical Data (1928-2025)
```sql
- id: Primary key
- ceremony_year: Year of ceremony (e.g., 2024 for 2023 movies)
- category_id: Foreign key to oscar_categories
- movie_id: Foreign key to oscar_movies (nullable)
- nominee_name: Name of nominee (for acting/directing categories)
- person_id: TMDB person ID for actors/actresses/directors (Int, nullable)
- profile_path: TMDB profile image path for person thumbnails (String, nullable)
- is_winner: Boolean flag for wins vs nominations
- created_at, updated_at: Timestamps
```

### Legacy Table (Deprecated)

#### `oscar_data` - User Collection Oscar Data (DEPRECATED)
```sql
- movie_id: Foreign key to user's movies table
- ceremony_year, category, is_winner, nominee_name
```
**Status**: This table is deprecated. All 2024-2025 data has been migrated to the unified `oscar_nominations` table.

### Relationship Structure

```
oscar_categories (1) ← (many) oscar_nominations (many) → (1) oscar_movies
                                      ↓
                            TMDB ID matching to user's movies table
```

## Collection Status Matching

The system determines if an Oscar-nominated movie is in the user's collection through **TMDB ID matching**:

1. **User Collection**: `movies` table with `approval_status = 'approved'`
2. **Oscar Movies**: `oscar_movies` table with TMDB IDs
3. **Matching Logic**: Map oscar movies to user collection via `tmdb_id`
4. **Visual Indicator**: Movies NOT in collection display with `grayscale opacity-70` styling

## API Endpoints

### Primary Endpoints

#### `/api/oscars/years/[year]` - Year-Specific Data
**Purpose**: Get all nominations for a specific ceremony year
**Parameters**:
- `year`: Ceremony year (e.g., 2024)

**Response**:
```json
{
  "success": true,
  "data": {
    "nominations": [...],
    "grouped_by_category": {...},
    "grouped_by_category_group": {...},
    "stats": {
      "ceremony_year": 2024,
      "total_nominations": 120,
      "total_winners": 24,
      "categories_count": 24,
      "movies_nominated": 45
    }
  }
}
```

#### `/api/oscars/nominations` - Category-Filtered Data
**Purpose**: Get nominations with filtering options
**Query Parameters**:
- `year`: Filter by ceremony year
- `category`: Filter by category name (e.g., "Best Actor")
- `winner_only`: Boolean to show only winners
- `limit`, `offset`: Pagination
- `group_by_year`: Boolean to group results by year

**Response**:
```json
{
  "success": true,
  "data": {
    "nominations": [...],
    "grouped_by_year": {...},
    "pagination": {
      "total_count": 500,
      "limit": 100,
      "offset": 0,
      "has_more": true
    }
  }
}
```

#### `/api/oscars/categories` - Category Management
**Purpose**: Get all Oscar categories with statistics
**Query Parameters**:
- `group`: Filter by category group
- `active_only`: Show only active categories

### Supporting Endpoints

- `/api/oscars/overview` - Statistics and overview data
- `/api/oscars/route.ts` - Root Oscar API
- `/api/oscars/sync` - Data synchronization
- `/api/oscars/import` - Data import utilities
- `/api/oscars/integrate` - Legacy integration tools
- `/api/oscars/best-picture/*` - Best Picture specific endpoints

## Frontend Architecture

### Main Components

#### `/app/oscars/page.tsx` - Primary Oscar Interface
**Features**:
- **View Toggle**: Grid view (visual) and Table view (data review) - **defaults to Table**
- **Table View**: Sortable columns, year/category filtering, TMDB ID validation
- **Grid View**: Movie grid with poster display, collection status visual indicators
- Category dropdown (defaults to "Best Picture")
- Year navigation with decade grouping
- Search and filtering functionality

**Key State Management**:
```typescript
const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); // Defaults to table
const [selectedCategory, setSelectedCategory] = useState<string>('Best Picture');
const [selectedYear, setSelectedYear] = useState<number | null>(null);
const [movieData, setMovieData] = useState<Record<number, MovieWithOscars>>({});
```

**Table View Features** (Primary for data validation):
- **Default Sort**: Ceremony year descending (2025 → 1928)
- **Sortable Columns**: Title, TMDB ID, Oscar Years, Wins, Nominations
- **Year Filter**: Dropdown with all ceremony years
- **Category Filter**: Multi-select with AND logic (Best Picture, Best Actor, etc.)
- **TMDB ID Status**: Clear indicators for missing IDs
- **API Endpoint**: `/api/oscars/table` - aggregates nomination data per movie

#### `/app/oscars/[year]/page.tsx` - Year-Specific View
**Features**:
- Detailed view for specific ceremony years
- Category filtering within the year
- Winner vs nominee distinction
- Movie details modal integration

### Oscar Components

#### `OscarTableView.tsx` (`src/components/oscar/`)

**Purpose:** Dual-mode interface for Oscar data - data validation (Table) and visual browsing (Grid)

**View Modes:**

##### Table Mode (Data Validation)
**Primary interface for data review and validation**

**Features:**
- **Sortable Columns**: Click headers to sort by Title, TMDB ID, Oscar Years, Wins, or Nominations
- **Default Sort**: Ceremony year descending (most recent first)
- **Year Filter**: Dropdown to filter by specific ceremony year
- **Category Filter**: Multi-select buttons for all available categories
- **AND Logic**: Filters work together (year AND category)
- **TMDB ID Status**: Clear visual indicators for missing IDs (red "Missing" badge)
- **Nomination Display**: Clean stacked rows with person thumbnails for acting/directing categories
- **Movie Count**: Real-time count of filtered results
- **Movie Posters**: 40x60px vertical thumbnails in first column

**Use Cases:**
1. Identify movies needing TMDB ID mapping (red "Missing" indicators)
2. Validate data for specific years (e.g., verify all 2024 nominees are correct)
3. Review category-specific nominations (e.g., all Best Picture winners)
4. Spot-check data integrity (multiple years, duplicate entries)

##### Grid Mode (Visual Browsing)
**Visual interface for exploring Oscar nominees with smart thumbnail display**

**Features:**
- **Responsive Grid**: 3/5/6/8 columns (mobile/md/lg/xl screens)
- **Smart Thumbnails**: Displays person photos when filtering by actor/director categories
- **Hover Interaction**: Person photo crossfades to movie poster on hover (300ms transition)
- **Person Categories**: Best Actor, Best Actress, Best Supporting Actor, Best Supporting Actress, Best Director
- **Winner Priority**: Shows winner's photo if multiple nominees, otherwise first nominee
- **Visual Indicators**:
  - Trophy badge (🏆) for wins with count
  - Green checkmark for movies in collection
  - Hover overlay with person name, movie title, years, stats
- **Movie Posters**: For non-person categories, always shows movie poster
- **Fallback Icons**: User icon for missing person photos, Film icon for missing posters

**Technical Implementation:**
```typescript
// API endpoint provides aggregated data
const response = await fetch('/api/oscars/table');
// Returns: { movies: OscarTableMovie[], success: boolean }

// Data structure:
interface OscarTableMovie {
  oscar_movie_id: number;
  tmdb_id: number | null;
  title: string;
  poster_path: string | null;              // From oscar_movies table
  ceremony_years: number[];
  nominations: OscarTableNomination[];     // Includes person_id, profile_path
  win_count: number;
  nomination_count: number;
  in_collection: boolean;
  collection_id: number | null;
}

// Person thumbnail logic (Grid mode):
const isShowingPersonCategories = selectedCategories.every(
  cat => personCategories.includes(cat)
);

// Smart thumbnail selection:
if (isShowingPersonCategories) {
  // Show person photo (default) → movie poster on hover
  const primaryPerson = getPrimaryPerson(movie); // Winner or first nominee
  // Crossfade transition between person.profile_path and movie.poster_path
}
```

**Workflow for Data Validation:**
1. Open table view (toggle in top-right)
2. Movies sort by year descending (2025 first)
3. Identify "Missing" TMDB ID badges
4. For each movie, search TMDB using ceremony_year - 1 as release year
5. Update oscar_movies record with correct TMDB ID
6. Switch to grid view to verify poster appears

#### `EditOscarMovieModal.tsx` (`src/components/oscar/`)

**Purpose:** Edit Oscar movie metadata for correcting TMDB ID mismatches and poster path issues

**Features:**
- **TMDB ID Correction** - Fix movies matched to wrong TMDB records
- **Poster Path Override** - Manually specify poster path if TMDB fetch fails
- **Real-time Preview** - See poster changes before saving
- **Validation** - Input validation and error handling
- **Immediate Updates** - UI reflects changes without page refresh

**Use Cases:**
1. Correcting duplicate movie entries with wrong TMDB IDs
2. Updating movies with changed TMDB records
3. Manually specifying posters for rare/foreign films
4. Fixing poster display issues for non-collection movies

**Technical Implementation:**
```typescript
// Update Oscar movie via API
await fetch(`/api/oscars/movies/${oscarMovieId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tmdb_id: 1000837, // Corrected TMDB ID
    poster_path: '/path/to/poster.jpg' // Optional override
  })
});

// On success:
// 1. Updates OscarMovie record
// 2. Fetches fresh poster from TMDB if tmdb_id changed
// 3. Updates UI without page reload
```

**Workflow:**
1. Navigate to Oscar page
2. Identify movie with incorrect/missing poster
3. Click "Edit" button
4. Enter correct TMDB ID or poster path
5. Preview shows new poster
6. Save updates OscarMovie record
7. UI refreshes with corrected data

**→ See [process.md § Oscar Editing Workflow](./process.md#oscar-editing-workflow) for detailed workflow**

### Data Flow

1. **Initial Load**: Fetch overview data and default "Best Picture" category
2. **Category Selection**: Filter nominations by selected category
3. **Year Navigation**: Jump to specific years or browse by decades
4. **Collection Matching**: Display movies with appropriate styling based on collection status
5. **Poster Resolution**: Fetch missing posters from TMDB API for non-collection movies

## TMDB Integration

### Poster Path Resolution

For movies **NOT** in the user's collection that lack poster paths:

```typescript
// API-level poster fetching for non-collection movies
if (!collectionMovie && nomination.movie?.tmdb_id && !posterPath) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://yourdomain.com'
      : 'http://localhost:3002';
    const tmdbResponse = await fetch(`${baseUrl}/api/tmdb/movie/${nomination.movie.tmdb_id}`);
    if (tmdbResponse.ok) {
      const tmdbData = await tmdbResponse.json();
      if (tmdbData.success && tmdbData.data?.poster_path) {
        posterPath = tmdbData.data.poster_path;
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch TMDB poster for ${nomination.movie.title}:`, error);
  }
}
```

### Internal TMDB API

The system uses the internal `/api/tmdb/movie/[id]` endpoint rather than direct TMDB API calls for:
- Consistent error handling
- Rate limiting management
- Unified response format

## Visual Styling

### Collection Status Indicators

```typescript
// Movies NOT in user's collection
className={cn(
  "object-cover",
  !movie.in_collection && "grayscale opacity-70"
)}
```

### Oscar Status Indicators

- **Winners**: Gold/trophy icons
- **Nominees**: Silver/star icons
- **Category Badges**: Color-coded by category group
- **Year Navigation**: Timeline-style navigation

## Data Import & Migration

### Current Data Structure (REBUILT - January 2025)

The Oscar database was completely rebuilt in January 2025 with automated TMDB verification:

**Data Source:**
- **Primary**: `/oscar-nominations.json` - Comprehensive Oscar data with pre-matched TMDB IDs
- **Format**: JSON array with structured nomination objects
- **Coverage**: 10,568 total nominations across 34 categories (1927-2023 film years)
- **TMDB Integration**: Each movie includes `tmdb_id` and `imdb_id` for verification
- **Imported Categories**: 6 categories (Best Picture, Actor, Actress, Director, Supporting Actor, Supporting Actress)
- **Available for Import**: 28 additional categories (Screenplay, Cinematography, Technical awards, etc.)

**Current Import Stats:**
- **Total Movies**: 1,409 unique movies with verified TMDB IDs
- **Total Nominations**: 2,913 nominations
- **Categories**: 6 imported (28 more available in source data)
- **Ceremony Years**: 1929-2024 (film years 1927-2023 + 1 year conversion)
- **TMDB Verification**: 99.7% auto-verified (1,405 movies), 0.3% manually reviewed (4 movies)
- **Completion**: 100% verified

**→ See [skills/oscar-tmdb-import.md](./skills/oscar-tmdb-import.md) for complete import workflow**

### JSON Data Structure

```json
{
  "category": "Best Picture",
  "year": "2023",
  "nominees": [],
  "movies": [
    {
      "title": "Oppenheimer",
      "tmdb_id": 872585,
      "imdb_id": "tt15398776"
    }
  ],
  "won": true
}
```

**Key Data Elements:**
- **category**: Oscar category name (e.g., "Best Picture", "Best Actor")
- **year**: Film release year (ceremony year = year + 1)
- **nominees**: Array of nominee names (for acting/directing categories)
- **movies**: Array of movie objects with TMDB/IMDb IDs
- **won**: Boolean indicating winner vs nominee

### Critical Data Integrity Rules

⚠️ **IMPORTANT**: The following rules ensure data accuracy:

1. **Ceremony Year Convention**:
   - JSON contains **film release year** (e.g., "2023" = films from 2023)
   - Database stores **ceremony year** (e.g., 2024 = ceremony in March 2024)
   - Conversion: `ceremony_year = film_year + 1` (handled automatically by import script)
   - Example: 2023 films → 2024 ceremony (96th Academy Awards, March 2024)

2. **TMDB Verification**:
   - Automated fuzzy title matching (85% similarity threshold)
   - Year validation with ±1 tolerance (accounts for festival releases, delays)
   - Confidence scoring (0.0-1.0) for manual review prioritization
   - Expected year: `ceremony_year - 1` with ±1 tolerance

3. **TMDB ID Uniqueness**: Each `tmdb_id` can only exist once in `oscar_movies`

4. **Incremental Import Safety**:
   - New category imports preserve existing verified movies
   - Existing movies skip re-verification (preserve review_status)
   - Duplicate nominations prevented at database level

### Data Import Process (January 2025)

```bash
# INCREMENTAL IMPORT (recommended - preserves existing data)
# Add new categories without affecting verified movies
node scripts/import-oscars-incremental.js "Best Supporting Actress" "Best Original Screenplay"

# The incremental script:
# 1. Checks for existing categories and skips them
# 2. Identifies existing movies by TMDB ID and preserves their review_status
# 3. Verifies only NEW movies with TMDB API (fuzzy matching + year validation)
# 4. Inserts new movies with auto_verified or needs_manual_review status
# 5. Creates nominations while preventing duplicates
# 6. Reports: movies created, movies preserved, verification stats

# FULL IMPORT (use only for initial setup or complete reset)
# WARNING: Deletes all existing Oscar data
node scripts/import-oscars.js

# The full import script:
# 1. Clears all existing Oscar data (categories, movies, nominations)
# 2. Filters oscar-nominations.json to TARGET_CATEGORIES
# 3. Verifies ALL movies with TMDB API (100% fresh verification)
# 4. Creates categories, movies, and nominations from scratch
# 5. Reports: auto-verified count, needs review count, total nominations
```

**Import Performance:**
- Rate limiting: 250ms delay between TMDB API calls
- ~1,000 movies = ~4 minutes verification time
- Incremental import skips existing movies (faster for adding categories)
- 99%+ auto-verification rate (1-2% flagged for manual review)

**Manual Review Process:**
1. Import flags suspicious TMDB IDs with verification_notes
2. Navigate to `/oscars/review` (admin-only)
3. Review flagged movies with auto-populated TMDB search
4. Select correct match or confirm existing ID
5. System updates review_status to manually_reviewed

### Poster Population Process

After importing Oscar movies with TMDB IDs, posters must be populated from TMDB to enable grid view display.

**Script:** `scripts/populate-oscar-posters.js`

**Purpose:** Fetch and store poster paths from TMDB for all Oscar movies

**Process:**
1. Query all Oscar movies with `tmdb_id IS NOT NULL` and `poster_path IS NULL`
2. Fetch movie details from TMDB API for each movie
3. Extract `poster_path` from TMDB response
4. Update `oscar_movies.poster_path` with the fetched path
5. Log progress and failures for review

**Features:**
- **Batch Processing**: Processes 50 movies at a time with progress updates
- **Rate Limiting**: 250ms delay between TMDB requests (safe for API limits)
- **Incremental**: Only processes movies with NULL poster_path (safe to re-run)
- **Error Handling**: Retries and logs failures to CSV
- **Progress Tracking**: Real-time console output and log file

**Usage:**
```bash
# Run poster population (incremental - only NULL poster paths)
node scripts/populate-oscar-posters.js

# Expected output:
# === Populating Oscar Movies with Poster Paths ===
# Found 1409 movies to process
#
# --- Batch 1/29 (1-50/1409) ---
# [1/1409] ✅ Wings - /kEl6KCBgdmT1Nex3ka0EIWAOmtm.jpg
# [2/1409] ✅ The Racket - /2EuE65PU92QAZ3xEnC9z0iAWzQA.jpg
# ...
#
# === FINAL SUMMARY ===
# Total processed: 1409
# Successful: 1409
# No poster available: 0
# Failed: 0
# Success rate: 100.0%
```

**Performance:**
- **~1,400 movies** ≈ 6-7 minutes processing time
- **Rate limit**: 250ms between requests = ~240 movies/minute
- **Success rate**: Typically 99%+ (TMDB has posters for nearly all Oscar nominees)

**When to Run:**
1. **After initial import**: Populate all movies after running `import-oscars.js`
2. **After adding categories**: When incremental import adds new movies
3. **Periodic refresh**: Re-run occasionally to fetch updated posters from TMDB

**Integration with Grid View:**
- Grid mode checks `movie.poster_path` first (from oscar_movies table)
- Falls back to collection poster if Oscar movie has no poster
- Displays Film icon if both are NULL
- Person categories use `profile_path` from nominations for actor/director thumbnails

### Historical Context: Why Automated Verification?

**Previous Issues (Pre-January 2025):**
- Manual TMDB ID mapping was time-intensive (1,152 movies to manually map)
- No systematic verification of TMDB ID accuracy
- Year offset errors between ceremony year and release year

**New Approach (January 2025):**
- Source data (oscar-nominations.json) includes pre-matched TMDB IDs
- Automated verification against TMDB API ensures accuracy
- Fuzzy title matching (85% threshold) with Levenshtein distance
- Year validation (ceremony_year - 1 ± 1 year tolerance)
- Confidence scoring flags edge cases for human review
- 99.7% auto-verification success rate (4/1,409 needed manual review)

## Development Commands

```bash
# Import new Oscar categories (incremental - safe for production)
node scripts/import-oscars-incremental.js "Best Supporting Actress" "Best Original Screenplay"

# Populate Oscar movie posters (run after import)
node scripts/populate-oscar-posters.js

# Populate person data for actors/directors (run after import)
node scripts/populate-oscar-people.js

# View manual review interface (admin-only)
# Navigate to: http://localhost:3000/oscars/review

# Check verification stats
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.oscarMovie.groupBy({
  by: ['review_status'],
  _count: true
}).then(stats => {
  console.table(stats);
  prisma.\$disconnect();
});
"

# Check poster population status
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.oscarMovie.aggregate({
  _count: { poster_path: true }
}).then(result => {
  prisma.oscarMovie.count().then(total => {
    console.log('Movies with posters:', result._count.poster_path, '/', total);
    prisma.\$disconnect();
  });
});
"

# Start development server
npm run dev

# View Oscar data
# Navigate to: http://localhost:3000/oscars
# Click Grid/Table toggle (top-right) to switch views:
# - Grid view: Visual browsing with person thumbnails, hover effects
# - Table view: Data validation, sortable, filterable
```

## Key Features

### ✅ Implemented
- **Complete Historical Data**: 2,913 nominations across ceremony years 1929-2024
- **Automated TMDB Verification**: 99.7% auto-verification with fuzzy matching and year validation
- **6 Oscar Categories**: Best Picture, Actor, Actress, Director, Supporting Actor, Supporting Actress
- **Unified Database Architecture**: Clean separation between Oscar data and user collection
- **Table View Interface**: Sortable, filterable interface for browsing Oscar data
  - Default sort: ceremony year descending
  - Multi-select category filtering
  - Year dropdown filtering
  - Visual Oscar badges (wins vs nominations)
- **Grid View Interface**: Visual movie browsing with poster display
- **Manual Review UI** (`/oscars/review`): Admin interface for verifying flagged TMDB IDs
  - Auto-populated TMDB search with ceremony_year - 1
  - Confidence score visualization
  - Verification notes display
  - Quick actions (Skip, Keep Original, Update)
- **Incremental Import System**: Safe category expansion without data loss
- **TMDB ID-based Collection Matching**: Shows which Oscar movies are in user's collection
- **Grayscale Styling**: Visual indicator for movies not in collection
- **Mobile-responsive Design**: Dark theme with premium UI/UX

### 🎯 Architecture Strengths
- **Single Source of Truth**: Unified `oscar_nominations` table
- **Verified Data Quality**: 100% TMDB ID verification (1,409/1,409 movies)
- **Automated Verification**: Fuzzy matching with 85% threshold, ±1 year tolerance
- **Incremental Expansion**: Add categories without re-verifying existing movies
- **Efficient Matching**: Database-level TMDB ID joins for collection status
- **Scalable**: Currently handles 6 categories, easily expandable to all 34
- **Performance**: Database-optimized queries, rate-limited TMDB verification (250ms delay)
- **Future-Proof**: Annual ceremony updates via JSON append + incremental import

### 🛠 Maintenance Notes
- **Adding New Categories**: Use `import-oscars-incremental.js` with category names as arguments
- **Annual Updates**: Append new ceremony data to `oscar-nominations.json` and run incremental import
- **Monitoring**: Check `/oscars/review` periodically for any flagged TMDB IDs
- **Expanding Coverage**: 28 additional categories available in source data (Screenplay, Cinematography, Technical)
- **Data Verification**: Use verification scripts to spot-check TMDB ID accuracy
- **Collection Matching**: Automatic via TMDB ID joins, no maintenance required

## Troubleshooting

### Common Issues

1. **Missing Posters**: Ensure TMDB API is accessible and movie has valid TMDB ID
2. **Incorrect Collection Status**: Check TMDB ID matching between `oscar_movies` and user's `movies` table
3. **Category Filter Empty**: Verify category name matches exactly in `oscar_categories` table
4. **Year Navigation Issues**: Check ceremony year format (year of ceremony, not eligible movies)

### Data Verification Commands

```bash
# Verify specific ceremony years (should match expected winners)
curl "http://localhost:3002/api/oscars/years/2020" # Should show Parasite
curl "http://localhost:3002/api/oscars/years/2021" # Should show Nomadland
curl "http://localhost:3002/api/oscars/years/2022" # Should show CODA
curl "http://localhost:3002/api/oscars/years/2023" # Should show Everything Everywhere All at Once
curl "http://localhost:3002/api/oscars/years/2024" # Should show Oppenheimer

# Check for duplicate movies across years (should return unique sets)
curl "http://localhost:3002/api/oscars/nominations?limit=1000" | jq '.data.nominations[] | select(.movie.title=="Everything Everywhere All at Once") | {year: .ceremony_year, category: .category}'

# Verify database state
npx prisma studio

# Check nomination counts by year
sqlite3 prisma/dev.db "SELECT ceremony_year, COUNT(*) as nominations FROM oscar_nominations GROUP BY ceremony_year ORDER BY ceremony_year DESC LIMIT 10;"
```

### Database Integrity Checks

```sql
-- Check for duplicate TMDB IDs in oscar_movies (should return 0)
SELECT tmdb_id, COUNT(*) as count FROM oscar_movies GROUP BY tmdb_id HAVING COUNT(*) > 1;

-- Check for duplicate nominations (same movie, category, year - should be rare)
SELECT movie_id, category_id, ceremony_year, COUNT(*) as count
FROM oscar_nominations
GROUP BY movie_id, category_id, ceremony_year
HAVING COUNT(*) > 1;

-- Verify ceremony year ranges (should be 1978-2025 based on current data)
SELECT MIN(ceremony_year) as earliest, MAX(ceremony_year) as latest FROM oscar_nominations;
```

## Architecture Decisions & Design Philosophy

### Why Unified Architecture?
The system evolved from multiple Oscar data sources into a unified architecture for:

1. **Single Source of Truth**: All Oscar data flows through `oscar_nominations` table
2. **TMDB Integration**: Consistent movie identification via TMDB IDs
3. **Performance**: Database-level joins instead of API calls for collection matching
4. **Maintainability**: Clear separation between Oscar data and user collection data
5. **Scalability**: Can handle 95+ years of Oscar history efficiently

### Key Design Decisions

**Ceremony Year vs Release Year**: The `ceremony_year` field represents when the ceremony occurred, not when movies were released. This matches how Oscars are commonly referenced.

**TMDB ID as Primary Key**: Using TMDB IDs enables seamless integration with the user's movie collection and provides reliable poster/metadata fetching.

**Soft Collection Matching**: Oscar movies exist independently of user collection, with collection status determined at query time via TMDB ID matching.

**Category Grouping**: Categories are grouped (Acting, Directing, Technical) for better UI organization and filtering.

### Future-Proofing Considerations

- **Easy Annual Updates**: Adding new ceremony years requires only JSON data updates
- **API Versioning**: Endpoints designed to handle evolving Oscar category structures
- **Collection Independence**: Oscar data remains intact regardless of user collection changes
- **Performance Monitoring**: Database indexes on ceremony_year, category_id, movie_id for optimal query performance

## System Status (January 2025)

✅ **PRODUCTION-READY**: Automated import system operational with 100% verification

**Current State:**
- ✅ **1,409 movies** with verified TMDB IDs (100% completion)
- ✅ **2,913 nominations** across ceremony years 1929-2024
- ✅ **6 categories imported**: Best Picture, Actor, Actress, Director, Supporting Actor, Supporting Actress
- ✅ **28 categories available**: Ready for incremental import from source data
- ✅ **Automated TMDB verification**: 99.7% auto-verification rate (1,405/1,409)
- ✅ **Manual review completed**: 4 edge cases verified by user
- ✅ **Review UI operational**: `/oscars/review` interface for future flagged movies
- ✅ **Incremental import tested**: Successfully added Supporting Actress without data loss
- ✅ **Table view interface**: Sortable, filterable Oscar data browsing
- ✅ **Grid view interface**: Visual movie posters with collection status
- ✅ **Mobile-responsive UI**: Dark theme with premium animations

**Next Recommended Actions:**
1. **Expand Categories**: Import additional categories using incremental script
   - Screenplay categories (Original, Adapted)
   - Cinematography, Film Editing
   - Sound, Visual Effects, Production Design
   - Original Score, Original Song
2. **Annual Updates**: Prepare workflow for 2025 ceremony data (March 2025)
3. **Optional Enhancements**:
   - Oscar statistics dashboard (wins per person, studio trends)
   - Advanced filtering (decade view, multiple category combinations)
   - Nomination history timeline for individual movies

**Verified Data Quality:**
- 99.7% auto-verification success (1,405/1,409 movies)
- 0.3% manual review (4 movies - completed)
- Zero TMDB ID duplicates
- Ceremony year convention verified across all decades
- Fuzzy matching handles title variations, foreign films, special characters

This documentation provides a complete reference for understanding and maintaining the Oscar data system architecture.

---

## Related Documentation

- **Quick Start:** [session-start/QUICK-START.md](./session-start/QUICK-START.md) - Rapid orientation for new agents
- **Main Overview:** [CLAUDE.md](./CLAUDE.md) - Project overview, tech stack, database schema
- **Architecture:** [architecture.md](./architecture.md) - System architecture, components, API structure
- **Development Process:** [process.md](./process.md) - Workflows, deployment, maintenance tasks
- **Skills:** [skills/](./skills/) - Claude Code skills for common tasks

**For Oscar workflows, see:** [process.md § Oscar Editing Workflow](./process.md#oscar-editing-workflow)