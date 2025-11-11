# Oscar Data System Documentation

**Last Updated:** November 2024

**→ For quick orientation, read [session-start/QUICK-START.md](./session-start/QUICK-START.md) first**

## ⚠️ Current Status: Data Rebuild (November 2024)

**System State:** Fresh import completed, TMDB ID mapping in progress

The Oscar data system was completely rebuilt in November 2024 to resolve systematic data quality issues. Current state:

- ✅ **1,152 unique movies** imported from clean CSV source
- ✅ **2,074 nominations** across 97 ceremony years (1928-2025)
- ✅ **4 core categories**: Best Picture, Best Actor, Best Actress, Best Director
- ⚠️ **TMDB IDs**: None mapped yet (manual mapping in progress)
- 📊 **Table View**: Primary interface for reviewing and validating data

**Next Step:** Manual TMDB ID mapping using table view interface

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
- created_at, updated_at: Timestamps
```

#### 3. `oscar_nominations` - Complete Historical Data (1928-2025)
```sql
- id: Primary key
- ceremony_year: Year of ceremony (e.g., 2024 for 2023 movies)
- category_id: Foreign key to oscar_categories
- movie_id: Foreign key to oscar_movies (nullable)
- nominee_name: Name of nominee (for acting/directing categories)
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

**Purpose:** Primary data validation and review interface for Oscar movies

**Features:**
- **Sortable Columns**: Click headers to sort by Title, TMDB ID, Oscar Years, Wins, or Nominations
- **Default Sort**: Ceremony year descending (most recent first)
- **Year Filter**: Dropdown to filter by specific ceremony year
- **Category Filter**: Multi-select buttons for Best Picture, Best Actor, Best Actress, Best Director
- **AND Logic**: Filters work together (year AND category)
- **TMDB ID Status**: Clear visual indicators for missing IDs (red "Missing" badge)
- **Nomination Display**: Color-coded badges showing wins (W) vs nominations (N) by category
- **Movie Count**: Real-time count of filtered results

**Use Cases:**
1. Identify movies needing TMDB ID mapping (red "Missing" indicators)
2. Validate data for specific years (e.g., verify all 2024 nominees are correct)
3. Review category-specific nominations (e.g., all Best Picture winners)
4. Spot-check data integrity (multiple years, duplicate entries)

**Technical Implementation:**
```typescript
// API endpoint provides aggregated data
const response = await fetch('/api/oscars/table');
// Returns: { movies: OscarTableMovie[], success: boolean }

// Table view aggregates:
// - ceremony_years: Array of years movie was nominated
// - nominations: All nominations with category, winner status, year
// - win_count: Total wins across all categories
// - nomination_count: Total nominations
// - in_collection: Whether user has this movie
```

**Workflow for TMDB ID Mapping (Next Session):**
1. Open table view (default on /oscars page)
2. Movies sort by year descending (2025 first)
3. Identify "Missing" TMDB ID badges
4. For each movie, search TMDB using ceremony_year - 1 as release year
5. Update oscar_movies record with correct TMDB ID
6. Verify poster appears in grid view

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

### Current Data Structure (REBUILT - November 2024)

The Oscar database was completely rebuilt in November 2024 from a clean CSV source:

**Data Source:**
- **Primary**: `/academy.csv` - Clean ceremony data from Wikipedia/Academy archives
- **Format**: CSV with columns: Year, Best Picture, Best Actor, Best Actress, Best Director
- **Coverage**: 97 ceremony years (1928-2025, listed as "2025 (97th)", etc.)
- **Winner Format**: Movies/nominees marked with "(winner)" suffix
- **Actor/Director Format**: "Name – Movie Title" format

**Import Stats:**
- **Total Movies**: 1,152 unique movies
- **Total Nominations**: 2,074 nominations
- **Categories**: 4 core categories (Best Picture, Best Actor, Best Actress, Best Director)
- **TMDB IDs**: 0 (manual mapping in progress via table view)

### CSV Format & Structure

```csv
Year,Best Picture,Best Actor,Best Actress,Best Director
2024 (96th),"Oppenheimer (winner), American Fiction, Anatomy of a Fall...","Cillian Murphy – Oppenheimer (winner), Bradley Cooper – Maestro...","Emma Stone – Poor Things (winner), Lily Gladstone – Killers...","Christopher Nolan – Oppenheimer (winner), Justine Triet..."
```

**Key Parsing Rules:**
- Comma-separated lists within quoted fields
- Winner detection via "(winner)" suffix (case-insensitive, handles tied winners)
- Actor/Director format: Split on " – " to extract name and movie
- Year extraction: Parse first 4 digits from year cell

### Critical Data Integrity Rules

⚠️ **IMPORTANT**: The following rules prevent data corruption:

1. **Ceremony Year vs Release Year**:
   - CSV contains **ceremony year** (e.g., 2017 = 89th Academy Awards in Feb 2017)
   - For TMDB searches: **release_year = ceremony_year - 1**
   - Example: 2017 ceremony → search TMDB for "Moonlight 2016"

2. **TMDB ID Uniqueness**: Each `tmdb_id` can only exist once in `oscar_movies`

3. **No Duplicate Entries**: Same movie cannot win same category in multiple years

4. **Fresh Import Strategy**: Complete database reset prevents cascade issues

### Data Import Process (November 2024)

```bash
# Complete import from academy.csv
node scripts/import-academy-csv.js

# The script:
# 1. Parses academy.csv (97 years, 4 categories)
# 2. Extracts unique movies and all nominations
# 3. Searches TMDB for each movie using release_year = ceremony_year - 1
# 4. Inserts movies into oscar_movies (tmdb_id = null if not found)
# 5. Inserts nominations into oscar_nominations
# 6. Reports movies needing manual TMDB ID mapping

# Reset script (clears all Oscar data)
node scripts/reset-oscar-data.js

# Preserves oscar_categories, deletes:
# - oscar_nominations (all rows)
# - oscar_movies (all rows)
# - best_picture_nominees (all rows)
# - oscar_data (legacy, all rows)
```

### Historical Context: Why Complete Rebuild?

**Previous Issues (Pre-November 2024):**
- Year offset errors (ceremony year vs release year confusion)
- Duplicate entries from failed incremental fixes
- Incorrect TMDB ID mappings (67% error rate discovered in 2019 data)
- Cascading data corruption from decade-by-decade fixes
- Dozens of temporary fix scripts creating "butterfly effect" problems

**New Approach:**
- Single clean data source (academy.csv)
- Complete database reset before import
- Manual TMDB ID verification via table view
- Clear separation: import data first, map IDs second

## Development Commands

```bash
# Import Oscar data from academy.csv
node scripts/import-academy-csv.js

# Reset all Oscar data (preserves categories)
node scripts/reset-oscar-data.js

# Start development server
npm run dev

# View Oscar data in table view
# Navigate to: http://localhost:3000/oscars
# Toggle to Table view (default)
```

## Key Features

### ✅ Implemented
- Complete historical Oscar data coverage (1928-2025, 97 ceremonies)
- Clean CSV import with 1,152 movies and 2,074 nominations
- Unified database architecture
- **Table View Interface**: Primary tool for data validation and TMDB ID mapping
  - Sortable columns (default: year descending)
  - Year and category filtering
  - Clear TMDB ID status indicators
- **Grid View Interface**: Visual movie browsing (secondary)
- TMDB ID-based collection matching
- Grayscale styling for non-collection movies
- Category filtering and year navigation
- Mobile-responsive design with dark theme

### 🔄 In Progress
- **TMDB ID Mapping**: Manual verification and assignment via table view
- Poster path resolution for complete movie records

### 🔄 Architecture Strengths
- **Single Source of Truth**: Unified `oscar_nominations` table
- **Clean Data Foundation**: Fresh import from authoritative CSV source
- **Efficient Matching**: Database-level TMDB ID joins (once IDs are mapped)
- **Scalable**: Handles 97 years of Oscar data efficiently
- **Future-Proof**: Easy to add new ceremony years via CSV append
- **Performance**: Database-optimized queries, table view for bulk validation

### 🛠 Maintenance Notes
- Add new ceremony data by appending to `academy.csv` and re-running import
- Map TMDB IDs via table view interface for complete functionality
- Ensure `oscar_categories` table stays current (currently 4 core categories)
- Monitor collection status accuracy via TMDB ID matching

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

## System Status (November 2024)

⚠️ **DATA REBUILD IN PROGRESS**: Fresh import complete, TMDB ID mapping needed

**Current State:**
- ✅ **1,152 movies** imported from clean CSV source
- ✅ **2,074 nominations** across 97 ceremony years (1928-2025)
- ✅ **4 core categories**: Best Picture, Best Actor, Best Actress, Best Director
- ✅ **Table view interface** operational for data validation
- ⚠️ **TMDB IDs**: None mapped (0/1152) - manual mapping in progress
- ⚠️ **Poster paths**: Not available until TMDB IDs are mapped
- ✅ **Mobile-responsive UI** with dark theme
- ✅ **Import/reset scripts** working correctly

**Immediate Next Steps:**
1. Manual TMDB ID mapping using table view interface
2. Verify TMDB ID accuracy for recent years first (2020-2025)
3. Work backwards through decades for historical movies
4. Test poster fetching once sample of IDs are mapped
5. Validate collection matching functionality

**Next Recommended Enhancements (Post-TMDB Mapping):**
- Add more Oscar categories beyond core four (cinematography, editing, etc.)
- Implement caching for frequently accessed years
- Add Oscar statistics dashboard
- Consider bulk TMDB ID suggestion tool based on title + year matching

**Data Quality Improvements:**
- Previous system had 67% error rate in TMDB IDs (discovered in 2019 data audit)
- New approach: Manual verification via table view ensures accuracy
- Trade-off: More upfront work, but cleaner long-term data

This documentation provides a complete reference for understanding and maintaining the Oscar data system architecture.

---

## Related Documentation

- **Quick Start:** [session-start/QUICK-START.md](./session-start/QUICK-START.md) - Rapid orientation for new agents
- **Main Overview:** [CLAUDE.md](./CLAUDE.md) - Project overview, tech stack, database schema
- **Architecture:** [architecture.md](./architecture.md) - System architecture, components, API structure
- **Development Process:** [process.md](./process.md) - Workflows, deployment, maintenance tasks
- **Skills:** [skills/](./skills/) - Claude Code skills for common tasks

**For Oscar workflows, see:** [process.md § Oscar Editing Workflow](./process.md#oscar-editing-workflow)