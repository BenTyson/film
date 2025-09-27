# Oscar Data System Documentation

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
- Category dropdown (defaults to "Best Picture")
- Year navigation with decade grouping
- Movie grid with poster display
- Collection status visual indicators
- Search and filtering functionality

**Key State Management**:
```typescript
const [selectedCategory, setSelectedCategory] = useState<string>('Best Picture');
const [selectedYear, setSelectedYear] = useState<number | null>(null);
const [movieData, setMovieData] = useState<Record<number, MovieWithOscars>>({});
```

#### `/app/oscars/[year]/page.tsx` - Year-Specific View
**Features**:
- Detailed view for specific ceremony years
- Category filtering within the year
- Winner vs nominee distinction
- Movie details modal integration

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

### Historical Data (1928-2023)
- Source: `/src/data/oscar-nominations.json`
- Script: `/scripts/import-oscars.js`
- Imports to: `oscar_nominations` table

### Recent Data (2024-2025)
- Source: `/src/data/oscar-2024-2025.json`
- Script: `/scripts/import-oscar-2024-2025.js`
- Migration: `/scripts/migrate-2024-2025-to-nominations.js`

### Migration from Legacy System
The system migrated from the old `oscar_data` table to the unified `oscar_nominations` architecture:

```javascript
// Migration preserved all existing 2024-2025 data
// while establishing the new unified structure
```

## Development Commands

```bash
# Import historical Oscar data
node scripts/import-oscars.js

# Import 2024-2025 data
node scripts/import-oscar-2024-2025.js

# Migrate legacy data to unified system
node scripts/migrate-2024-2025-to-nominations.js

# Start development server
npm run dev -- --port 3002
```

## Key Features

### ✅ Implemented
- Complete historical Oscar data coverage (1928-2025)
- Unified database architecture
- TMDB ID-based collection matching
- Grayscale styling for non-collection movies
- Category filtering and year navigation
- Poster path resolution via internal TMDB API
- Mobile-responsive design with dark theme

### 🔄 Architecture Strengths
- **Single Source of Truth**: Unified `oscar_nominations` table
- **Efficient Matching**: Database-level TMDB ID joins
- **Scalable**: Handles 90+ years of Oscar data
- **Future-Proof**: Easy to add new ceremony years
- **Performance**: Minimal API calls, database-optimized queries

### 🛠 Maintenance Notes
- Add new ceremony data to `oscar_nominations` table
- Ensure `oscar_categories` table stays current
- Update TMDB poster fetching for new movies
- Monitor collection status accuracy via TMDB ID matching

## Troubleshooting

### Common Issues

1. **Missing Posters**: Ensure TMDB API is accessible and movie has valid TMDB ID
2. **Incorrect Collection Status**: Check TMDB ID matching between `oscar_movies` and user's `movies` table
3. **Category Filter Empty**: Verify category name matches exactly in `oscar_categories` table
4. **Year Navigation Issues**: Check ceremony year format (year of ceremony, not eligible movies)

### Debug Commands

```bash
# Check API endpoints
curl "http://localhost:3002/api/oscars/years/2024"
curl "http://localhost:3002/api/oscars/nominations?category=Best+Actor&year=2024"

# Verify database data
npx prisma studio
```

This documentation provides a complete reference for understanding and maintaining the Oscar data system architecture.