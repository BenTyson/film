# System Architecture

**Last Updated:** October 2024

**→ For quick orientation, read [session-start/QUICK-START.md](./session-start/QUICK-START.md) first**

## Overview
Personal movie tracking application with premium streaming service-quality interface, built on Next.js with PostgreSQL database and TMDB API integration.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App  │    │   PostgreSQL    │    │   TMDB API      │
│   (Frontend +   │◄──►│   Database      │    │   (External)    │
│    API Routes)  │    │   (Railway)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │
        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐
│   Framer Motion │    │   Prisma ORM    │
│   Radix UI      │    │   (Type Safety) │
│   Tailwind CSS  │    │                 │
└─────────────────┘    └─────────────────┘
```

## Data Flow Architecture

```
User Interaction
     │
     ▼
Next.js Frontend (React Components)
     │
     ▼
API Routes (/api/*)
     │
     ▼
Prisma ORM Client
     │
     ▼
PostgreSQL Database ◄──► TMDB API (for new movies)
```

## Database Schema Design

### Core Entities

```sql
-- Movies: Core movie data from TMDB
CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  release_date DATE,
  director VARCHAR(255),
  overview TEXT,
  poster_path VARCHAR(255),
  backdrop_path VARCHAR(255),
  runtime INTEGER,
  genres JSONB,
  imdb_id VARCHAR(20),
  imdb_rating DECIMAL(3,1),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User Movies: Personal tracking data
CREATE TABLE user_movies (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER REFERENCES movies(id),
  date_watched DATE NOT NULL,
  personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 10),
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  watch_location VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Oscar Data: Academy Award tracking
CREATE TABLE oscar_data (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER REFERENCES movies(id),
  ceremony_year INTEGER NOT NULL,
  category VARCHAR(100) NOT NULL,
  nomination_type VARCHAR(20) CHECK (nomination_type IN ('nominated', 'won')),
  nominee_name VARCHAR(255), -- For actor/director specific nominations
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tags: Watch buddy and category tags
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7), -- Hex color code
  icon VARCHAR(50), -- Lucide icon name
  created_at TIMESTAMP DEFAULT NOW()
);

-- Movie Tags: Many-to-many relationship
CREATE TABLE movie_tags (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER REFERENCES movies(id),
  tag_id INTEGER REFERENCES tags(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(movie_id, tag_id)
);
```

### Indexes for Performance

```sql
-- Essential indexes for fast queries
CREATE INDEX idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX idx_movies_title ON movies(title);
CREATE INDEX idx_movies_release_date ON movies(release_date);
CREATE INDEX idx_user_movies_movie_id ON user_movies(movie_id);
CREATE INDEX idx_user_movies_date_watched ON user_movies(date_watched);
CREATE INDEX idx_oscar_data_movie_id ON oscar_data(movie_id);
CREATE INDEX idx_oscar_data_ceremony_year ON oscar_data(ceremony_year);
CREATE INDEX idx_movie_tags_movie_id ON movie_tags(movie_id);
CREATE INDEX idx_movie_tags_tag_id ON movie_tags(tag_id);
```

## Component Architecture

### Recent UI Enhancements (2024-09-21)

### Advanced Filtering & Sorting System

The main movie page has been enhanced with a comprehensive filtering and sorting system designed for optimal user experience:

#### Year Filter with Movie Counts
- **Dropdown Selection**: Shows years from 1950 to current year
- **Movie Counts**: Displays subscript numbers showing movie count per year (e.g., "2024 · ₄₅")
- **Smart Display**: Only shows years with movies or recent years (last 5 years)
- **Performance**: Dedicated `/api/movies/years` endpoint for efficient count queries

#### Standalone Sort Controls
- **Sort Field Selection**: Date Watched, Title, Release Date, Personal Rating
- **Independent Sort Order**: Standalone toggle buttons (ArrowUp ↑ / ArrowDown ↓)
- **Visual Clarity**: Yellow active state, clear tooltips ("Oldest first" / "Newest first")
- **UI Separation**: Sort dropdown and order controls are visually independent

#### Search & Filtering Integration
- **Debounced Search**: 300ms delay to prevent excessive API calls
- **Combined Filters**: Search, year, and sort work together seamlessly
- **Real-time Updates**: Immediate re-fetch when any filter changes
- **State Persistence**: Filter states maintained during session

#### Performance Optimizations
- **Efficient Queries**: Prisma optimized queries with proper indexing
- **Pagination**: 20 items per page with infinite scroll
- **Caching**: Year counts cached on component mount
- **Responsive Design**: Mobile-first approach with hidden controls on small screens

### Technical Implementation Details

```typescript
// State Management Pattern
const [sortBy, setSortBy] = useState('date_watched');
const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
const [selectedYear, setSelectedYear] = useState('');
const [yearCounts, setYearCounts] = useState<Record<string, number>>({});

// API Integration
useEffect(() => {
  fetchMovies();
}, [debouncedSearchQuery, selectedYear, sortBy, sortOrder]);

// Dynamic Query Building
const params = new URLSearchParams({
  page: page.toString(),
  limit: '20',
  ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
  ...(selectedYear && { year: selectedYear }),
  sortBy,
  sortOrder,
});
```

## Frontend Component Hierarchy

```
App Layout (src/app/layout.tsx)
├── Navigation Header
├── Main Content Area
│   ├── Hero Section (Featured Movies)
│   ├── Movie Grid/Rows
│   │   ├── Movie Card
│   │   │   ├── Poster Image
│   │   │   ├── Title & Year
│   │   │   ├── Personal Rating
│   │   │   ├── Oscar Badges
│   │   │   └── Buddy Tags
│   │   └── Movie Details Modal
│   │       ├── Backdrop Image
│   │       ├── Movie Info
│   │       ├── Personal Notes
│   │       ├── Oscar Information
│   │       ├── TrailerPlayer (YouTube integration)
│   │       └── Edit Actions
│   ├── Filter & Sort Controls
│   │   ├── Search Input (with debouncing)
│   │   ├── Year Filter Dropdown (with movie counts)
│   │   ├── Sort Field Dropdown (date watched, title, release date, rating)
│   │   ├── Sort Order Toggle (oldest first ↑ / newest first ↓)
│   │   ├── View Mode Toggle (grid/list)
│   │   ├── Grid Density Control (4/5/6 columns)
│   │   ├── Rating Filter
│   │   ├── Genre Filter
│   │   ├── Oscar Filter
│   │   └── Buddy Filter
│   └── Pagination/Infinite Scroll
└── Footer
```

### Component Inventory

#### Movie Components (`src/components/movie/`)
- **MovieCard.tsx** - Individual movie card with poster, title, rating, Oscar badges
- **MovieGrid.tsx** - Grid layout for movie cards
- **MovieList.tsx** - List layout for movie items
- **MovieListItem.tsx** - Individual list item view
- **MovieDetailsModal.tsx** - Full movie details modal with backdrop, info, trailer
- **FixMovieModal.tsx** - Modal for fixing movie TMDB matching issues
- **AddToCalenModal.tsx** - Modal for adding movies to Calen buddy collection
- **TrailerPlayer.tsx** - YouTube trailer embed component

#### Oscar Components (`src/components/oscar/`)
- **EditOscarMovieModal.tsx** - Edit Oscar movie metadata (TMDB ID, poster path)
  - Used for correcting TMDB ID mismatches
  - Poster path override functionality
  - Real-time poster preview
  - Validation and error handling

#### Watchlist Components (`src/components/watchlist/`)
- **AddToWatchlistModal.tsx** - Search TMDB and add movies to watchlist
  - TMDB search integration
  - Mood tag selection (Morgan, Liam, Epic, Scary, Indie)
  - Poster preview
- **WatchlistMovieModal.tsx** - View/edit watchlist movie details
  - Tag management
  - Move to collection option
  - Remove from watchlist

#### Layout Components (`src/components/layout/`)
- **Navigation.tsx** - Main navigation header with links to pages

#### UI Components (`src/components/ui/`)
- **TagIcon.tsx** - Lucide icon selector for tags
- Radix UI primitives (Dialog, Select, Slider, Switch, etc.)

### Specialized Page Components

```
/oscars
├── Streamlined Header (matches main collection design)
├── Year Filter & Category Tabs
├── Lazy Loading (initial 3 years)
├── Infinite Scroll Oscar Movies
└── Performance Optimized Grid

/buddy/calen (Tag-Based Collection System)
├── Exact Main Page Layout Replica
├── "Add to Calen" Button & Modal
├── Search Existing Collection Movies
├── Tag-Based Movie Filtering
├── Real-time Tagging Workflow
└── Empty State with Call-to-Action

/add-movie
├── Search Input (TMDB)
├── Movie Results
├── Add Movie Form
└── Quick Add Actions
```

## API Architecture

### Next.js API Routes Structure

**Total: 38 API endpoints**

```
/api
├── /movies (12 endpoints)
│   ├── GET  /                        # List movies with filters & sorting
│   ├── POST /                        # Add new movie
│   ├── GET  /[id]                    # Get specific movie details
│   ├── PUT  /[id]                    # Update movie data
│   ├── DELETE /[id]/remove           # Remove movie from collection
│   ├── GET  /[id]/approve            # Approve pending movie (approval workflow)
│   ├── POST /[id]/update-tmdb        # Refresh movie data from TMDB
│   ├── POST /[id]/tags               # Add/remove tags from movie
│   ├── GET  /years                   # Get movie counts by release year (supports tag filtering)
│   ├── GET  /match-quality           # Movie matching quality analysis
│   ├── GET  /approval-stats          # Approval workflow statistics
│   ├── GET  /pending-approval        # List pending approval movies with details
│   ├── GET  /pending-approval-simple # Simplified pending approval list
│   ├── POST /migrate-approval        # Migrate approval data
│   └── GET  /link                    # Link movies (utility)
│
├── /oscars (12 endpoints)
│   ├── GET  /                        # List Oscar data overview
│   ├── GET  /overview                # Oscar statistics and overview
│   ├── GET  /categories              # List all Oscar categories
│   ├── GET  /nominations             # Get nominations with filtering
│   ├── GET  /years/[year]            # Get Oscar data for specific ceremony year
│   ├── GET  /movies/[id]             # Get Oscar data for specific movie
│   ├── POST /sync                    # Sync Oscar data
│   ├── POST /import                  # Import Oscar data from JSON
│   ├── POST /integrate               # Integrate Oscar data with collection
│   ├── GET  /best-picture            # Best Picture nominees list
│   ├── GET  /best-picture/[id]       # Best Picture nominee details
│   └── POST /best-picture/import     # Import Best Picture data
│
├── /watchlist (2 endpoints)
│   ├── GET/POST /                    # List watchlist or add movie to watchlist
│   └── GET/POST/DELETE /[id]         # Get, update, or remove watchlist movie
│
├── /tmdb (2 endpoints)
│   ├── GET  /search                  # Search TMDB for movies
│   └── GET  /movie/[id]              # Get TMDB movie details and credits
│
├── /tags (1 endpoint)
│   └── GET/POST /                    # List all tags or create new tag
│
├── /search (2 endpoints)
│   ├── GET  /                        # Generic search across collection
│   └── GET  /movies                  # Movie-specific search
│
├── /import (4 endpoints)
│   ├── POST /csv                     # Import movies from CSV
│   ├── POST /backfill-csv            # Backfill CSV import
│   ├── POST /clean-csv               # Clean CSV import with quality checks
│   └── POST /missing                 # Import missing movie data
│
└── /test (2 endpoints - development only)
    ├── GET  /test-tmdb               # Test TMDB API connection
    └── GET  /test-import             # Test import functionality
```

**→ For API usage patterns, see [session-start/QUICK-START.md § Common Tasks](./session-start/QUICK-START.md#6-common-tasks)**

### API Response Patterns

```typescript
// Standard API Response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Movie Response with Relations
interface MovieWithDetails {
  id: number;
  tmdb_id: number;
  title: string;
  release_date: string;
  director: string;
  poster_path: string;
  backdrop_path: string;
  user_movies: UserMovie[];
  oscar_data: OscarData[];
  movie_tags: MovieTag[];
}
```

## External API Integration

### TMDB API Integration

```typescript
// TMDB Client Configuration
class TMDBClient {
  private baseURL = 'https://api.themoviedb.org/3';
  private apiKey: string;

  // Rate limiting: 40 requests per 10 seconds
  private rateLimiter = new RateLimiter(40, 10000);

  async searchMovies(query: string): Promise<TMDBMovieSearchResult>;
  async getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails>;
  async getMovieCredits(tmdbId: number): Promise<TMDBCredits>;
  async getConfiguration(): Promise<TMDBConfiguration>;
}
```

### Caching Strategy

```
TMDB API Responses
├── Movie Details: Cache 7 days
├── Search Results: Cache 1 hour
├── Images: Cache 30 days
└── Configuration: Cache 24 hours

Database Queries
├── Movie Lists: Cache 5 minutes
├── Oscar Data: Cache 1 hour
├── User Stats: Cache 15 minutes
└── Tags: Cache 30 minutes
```

## Performance Optimization

### Frontend Optimizations
- **Image Optimization**: Next.js Image component with blur placeholders
- **Code Splitting**: Dynamic imports for heavy components
- **Virtualization**: React Window for large movie lists
- **Prefetching**: Link prefetching for navigation
- **Bundle Analysis**: Regular bundle size monitoring

### Database Optimizations
- **Connection Pooling**: Prisma connection pooling
- **Query Optimization**: Proper indexes and query analysis
- **Batch Operations**: Bulk inserts for data import
- **Read Replicas**: Consider for future scaling

### API Optimizations
- **Response Caching**: Redis for API response caching
- **Compression**: gzip compression for API responses
- **Rate Limiting**: Client-side and server-side rate limiting
- **CDN**: CloudFlare for static asset delivery

## Security Considerations

### API Security
- **Rate Limiting**: Per-IP and per-user rate limits
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection**: Prisma ORM prevents SQL injection
- **XSS Protection**: Next.js built-in XSS protection

### Environment Security
- **Environment Variables**: All secrets in Railway vault
- **HTTPS**: Force HTTPS in production
- **CORS**: Proper CORS configuration
- **Headers**: Security headers via Next.js config

## Deployment Architecture

### Railway Deployment

```
Railway Project
├── PostgreSQL Database
│   ├── Automated backups
│   ├── Connection pooling
│   └── Monitoring dashboard
└── Next.js Application
    ├── Environment variables
    ├── Build & deploy pipeline
    ├── Custom domain
    └── Analytics tracking
```

### CI/CD Pipeline

```
GitHub Repository
     │
     ▼
Railway Auto-Deploy
     │
     ▼
Build Process
├── npm install
├── Prisma generate
├── Next.js build
└── Type checking
     │
     ▼
Deploy to Production
├── Database migrations
├── Asset optimization
└── Health checks
```

## Watchlist Feature (October 2024)

### Architecture Overview
Mood-based movie watchlist system for tracking movies to watch, completely separate from the main collection. Users can search TMDB, add movies to watchlist with mood tags, and organize their watch queue.

### Technical Implementation

#### Database Models
```prisma
model WatchlistMovie {
  id            Int            @id @default(autoincrement())
  tmdb_id       Int            @unique
  title         String
  director      String?
  release_date  DateTime?
  poster_path   String?
  backdrop_path String?
  overview      String?
  runtime       Int?
  genres        Json?
  vote_average  Float?
  imdb_id       String?
  created_at    DateTime       @default(now())
  updated_at    DateTime       @updatedAt
  tags          WatchlistTag[]
}

model WatchlistTag {
  id                 Int            @id @default(autoincrement())
  watchlist_movie_id Int
  tag_id             Int
  created_at         DateTime       @default(now())
  watchlist_movie    WatchlistMovie @relation(fields: [watchlist_movie_id], references: [id])
  tag                Tag            @relation(fields: [tag_id], references: [id])

  @@unique([watchlist_movie_id, tag_id])
}
```

**Key Design Decision:** Separate `WatchlistMovie` table from main `Movie` collection allows:
- Independent watchlist management
- No approval workflow needed (direct from TMDB)
- Easy migration path: move watchlist item to main collection when watched
- Different filtering/sorting needs

#### API Endpoints
```
GET  /api/watchlist          - List all watchlist movies with tag filtering
POST /api/watchlist          - Add movie to watchlist with TMDB data
GET  /api/watchlist/[id]     - Get watchlist movie details
POST /api/watchlist/[id]     - Update watchlist movie tags
DELETE /api/watchlist/[id]   - Remove from watchlist
```

**Request/Response Pattern:**
```typescript
// POST /api/watchlist
Request: {
  tmdb_id: 872585,
  tags: ["Epic", "Morgan"]
}

Response: {
  success: true,
  data: {
    id: 123,
    tmdb_id: 872585,
    title: "Oppenheimer",
    tags: [
      { id: 1, name: "Epic", color: "#10b981" },
      { id: 2, name: "Morgan", color: "#3b82f6" }
    ]
  }
}
```

#### Components

**AddToWatchlistModal.tsx** (`src/components/watchlist/`)
- TMDB search integration
- Movie selection with poster preview
- Mood tag selection (multi-select)
- Add to watchlist workflow

**WatchlistMovieModal.tsx** (`src/components/watchlist/`)
- Display watchlist movie details
- Tag management (add/remove)
- Move to main collection option
- Remove from watchlist

#### Mood Tags
Shared `Tag` infrastructure with main collection:
- **Person-based:** Morgan, Liam (who wants to watch it)
- **Mood/Genre-based:** Epic, Scary, Indie (viewing mood)
- Color-coded for visual organization
- Multi-select enabled (movie can have multiple tags)

#### Watchlist Page (`/watchlist`)
- Grid layout matching main collection design
- Tag-based filtering
- TMDB poster integration
- "Add to Watchlist" button with modal
- Empty state with call-to-action

### Integration with Main Collection
```
User Workflow:
1. Search TMDB via AddToWatchlistModal
2. Select movie + mood tags
3. POST /api/watchlist creates WatchlistMovie + WatchlistTags
4. Movie appears on /watchlist page

Future: Move to Collection Workflow:
1. Watch movie from watchlist
2. Move to main collection (creates Movie + UserMovie)
3. Preserve tags, add date_watched
4. Remove from watchlist
```

### Performance Considerations
- **Efficient Filtering:** Tag-based WHERE clauses in Prisma
- **TMDB Integration:** Reuses existing TMDB client (`/lib/tmdb.ts`)
- **Lazy Loading:** Modal only searches when user types
- **State Management:** Optimized re-renders with proper dependency arrays

---

## Tag-Based Collection System (December 2024)

### Architecture Overview
The application now features a sophisticated tag-based collection system that allows users to create curated movie lists using tags like "Calen" for buddy-watched movies.

### Technical Implementation

#### Tag System Components
```typescript
// Database Models
model Tag {
  id         Int      @id @default(autoincrement())
  name       String   @unique
  color      String?  // Hex color (#8B5CF6 for Calen)
  icon       String?  // Lucide icon name (Users for Calen)
  created_at DateTime @default(now())
  movie_tags MovieTag[]
}

model MovieTag {
  id         Int      @id @default(autoincrement())
  movie_id   Int
  tag_id     Int
  created_at DateTime @default(now())
  movie Movie @relation(fields: [movie_id], references: [id])
  tag   Tag   @relation(fields: [tag_id], references: [id])
  @@unique([movie_id, tag_id])
}
```

#### API Endpoints for Tagging
```typescript
// POST /api/movies/[id]/tags
{
  "tags": ["Calen"]
}
// Response: Updated movie with new tags

// DELETE /api/movies/[id]/tags
{
  "tags": ["Calen"]
}
// Response: Movie with specified tags removed
```

#### Calen Page Features
- **Exact Layout Replication**: Mirrors main collection page design
- **Tag-Filtered API Calls**: `GET /api/movies?tag=Calen`
- **Add to Calen Modal**: Search existing collection and tag movies
- **Real-time Updates**: Immediate reflection of tagged movies
- **Empty State Handling**: Helpful onboarding for new collections

### Workflow Architecture
```
User clicks "Add to Calen"
     │
     ▼
AddToCalenModal opens
     │
     ▼
Search existing collection (/api/movies?search=query)
     │
     ▼
User selects movie to tag
     │
     ▼
POST /api/movies/[id]/tags { tags: ["Calen"] }
     │
     ▼
Modal updates to show success
     │
     ▼
Parent page refreshes to show newly tagged movie
```

### Performance Considerations
- **Efficient Filtering**: Tag-based WHERE clauses in Prisma queries
- **Year Count Support**: `/api/movies/years?tag=Calen` for filtered year statistics
- **Lazy Loading**: Modal only searches when user types
- **State Management**: Optimized re-renders with proper dependency arrays

## Utility Scripts

### Active Scripts (`/scripts/`)

**Oscar Data Management:**
- **import-oscars.js** - Main Oscar data import from `src/data/oscar-nominations.json`
  ```bash
  node scripts/import-oscars.js
  ```
  - Clears existing Oscar data (oscar_nominations, oscar_movies, oscar_categories)
  - Imports historical data (1928-2025)
  - Creates 1,158+ movies and 2,053+ nominations
  - Target categories: Best Picture, Best Actor, Best Actress, Best Director

**Development Utilities:**
- **reset-database.ts** - Reset database to empty state (DESTRUCTIVE)
  ```bash
  npx tsx scripts/reset-database.ts
  ```
  - WARNING: Deletes all data
  - Resets auto-increment counters
  - Use for clean development starts

- **test-clean-import.ts** - Test CSV import workflow
  ```bash
  npx tsx scripts/test-clean-import.ts
  ```
  - Tests dry run with 5 movies
  - Performs actual import with 20 movies
  - Validates pending approval API

- **check-import-data.ts** - Verify imported data integrity
  ```bash
  npx tsx scripts/check-import-data.ts
  ```
  - Database count verification
  - Sample data inspection
  - Query testing

**→ See [process.md](./process.md) for detailed script usage and workflows**

---

## Monitoring & Analytics

### Application Monitoring
- **Error Tracking**: Railway logs and alerts
- **Performance**: Core Web Vitals monitoring
- **Database**: Query performance tracking
- **API**: Response time monitoring

### User Analytics
- **Usage Patterns**: Movie viewing trends
- **Feature Adoption**: Filter usage analytics, tag system usage, watchlist engagement
- **Performance**: Page load times
- **Errors**: Client-side error tracking

---

## Related Documentation

- **Quick Start:** [session-start/QUICK-START.md](./session-start/QUICK-START.md) - Rapid orientation for new agents
- **Main Overview:** [CLAUDE.md](./CLAUDE.md) - Project overview, tech stack, database schema
- **Oscar System:** [oscars.md](./oscars.md) - Complete Oscar tracking system documentation
- **Development Process:** [process.md](./process.md) - Workflows, deployment, maintenance tasks
- **Skills:** [skills/](./skills/) - Claude Code skills for common tasks