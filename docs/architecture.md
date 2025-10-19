# System Architecture

**Last Updated:** January 2025

**→ For quick orientation, read [session-start/QUICK-START.md](./session-start/QUICK-START.md) first**

## Overview
Multi-user movie tracking application with premium streaming service-quality interface, built on Next.js with PostgreSQL database, Clerk authentication, and TMDB API integration.

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
│   Clerk Auth    │    │                 │
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
-- Users: Authentication via Clerk
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- 'user' or 'admin'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

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

-- User Movies: Personal tracking data (user-specific)
CREATE TABLE user_movies (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER REFERENCES movies(id),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date_watched DATE NOT NULL,
  personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 10),
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  buddy_watched_with JSONB, -- Array of buddy names: ["Calen", "Morgan"]
  watch_location VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_movies_user_id (user_id)
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

-- Tags: Watch buddy and category tags (user-specific or global)
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL for global tags
  color VARCHAR(7), -- Hex color code
  icon VARCHAR(50), -- Lucide icon name
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, user_id), -- Composite unique constraint
  INDEX idx_tags_user_id (user_id)
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

**Total: 39 API endpoints**

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
├── /buddies (1 endpoint)
│   └── GET  /                        # Get dynamic buddy presets (admin or user-specific)
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

### Authentication Security
- **Clerk Authentication**: Industry-standard OAuth 2.0 with JWT sessions
- **Session Management**: Secure HTTP-only cookies, automatic rotation
- **Middleware Protection**: All routes protected by Next.js middleware
- **User Isolation**: Strict database filtering prevents cross-user data access
- **Role-Based Access**: Admin role verification for privileged operations

### API Security
- **Authentication Required**: All API routes require valid Clerk session
- **Ownership Verification**: Mutations verify user owns the resource
- **Rate Limiting**: Per-IP and per-user rate limits
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection**: Prisma ORM prevents SQL injection
- **XSS Protection**: Next.js built-in XSS protection

### Environment Security
- **Environment Variables**: All secrets in Railway vault (Clerk keys, DB credentials)
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
  tmdb_id       Int
  user_id       Int
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
  user          User           @relation(fields: [user_id], references: [id], onDelete: Cascade)
  tags          WatchlistTag[]

  @@unique([tmdb_id, user_id])
  @@index([user_id])
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
- Mood tag selection (multi-select from defaults)
- Custom tag creation with input field + Add button
- Add to watchlist workflow

**WatchlistMovieModal.tsx** (`src/components/watchlist/`)
- Display watchlist movie details
- Tag management (add/remove)
- Move to main collection option
- Remove from watchlist

#### Mood Tags
Shared `Tag` infrastructure with main collection:
- **Default Global Tags:** Morgan, Epic, Indie, Funny, Drama, Classic
- **Custom User Tags:** Users can create their own tags via input field
- **User Isolation:** Tags are user-specific (user_id) or global (user_id: null)
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

## Vaults Feature (October 2024)

### Architecture Overview
Custom movie collection system for organizing films into thematic "vaults" (e.g., "Best Action Films of All Time", "Memorable Movies From my Childhood"). Vaults allow users to curate collections of movies that may or may not be in their watched collection, similar to playlists.

### Technical Implementation

#### Database Models
```prisma
model Vault {
  id          Int          @id @default(autoincrement())
  user_id     Int
  name        String
  description String?
  created_at  DateTime     @default(now())
  updated_at  DateTime     @updatedAt
  user        User         @relation(fields: [user_id], references: [id], onDelete: Cascade)
  movies      VaultMovie[]

  @@index([user_id])
  @@map("vaults")
}

model VaultMovie {
  id            Int       @id @default(autoincrement())
  vault_id      Int
  tmdb_id       Int
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
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
  vault         Vault     @relation(fields: [vault_id], references: [id], onDelete: Cascade)

  @@unique([vault_id, tmdb_id])
  @@index([vault_id])
  @@map("vault_movies")
}
```

**Key Design Decision:** Separate `VaultMovie` table from main `Movie` collection allows:
- Independence from watched collection (vault movies don't need to be watched)
- No approval workflow needed (direct from TMDB)
- Multiple vaults can contain the same movie
- Easy migration path: add vault movie to main collection when watched
- Different organizational paradigm (thematic vs. chronological)

#### API Endpoints
```
GET    /api/vaults             - List all user's vaults with preview posters
POST   /api/vaults             - Create new vault
GET    /api/vaults/[id]        - Get vault details with movies + collection status
PATCH  /api/vaults/[id]        - Update vault name/description
DELETE /api/vaults/[id]        - Delete vault and all movies
POST   /api/vaults/[id]/movies - Add movie to vault from TMDB
DELETE /api/vaults/[id]/movies/[movieId] - Remove movie from vault
```

**Request/Response Pattern:**
```typescript
// POST /api/vaults
Request: {
  name: "Best Action Films of All Time",
  description: "My favorite action movies"
}

Response: {
  success: true,
  data: {
    id: 1,
    name: "Best Action Films of All Time",
    description: "My favorite action movies",
    movie_count: 0
  }
}

// GET /api/vaults/[id]
Response: {
  success: true,
  data: {
    vault: {
      id: 1,
      name: "Best Action Films of All Time",
      movies: [
        {
          id: 5,
          tmdb_id: 155,
          title: "The Dark Knight",
          in_collection: true,           // Is this movie in user's watched collection?
          collection_movie_id: 42,        // Movie table ID if in collection
          poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
          ...
        }
      ]
    }
  }
}
```

#### Components

**VaultCard.tsx** (`src/components/vault/`)
- Visual card showing vault name, description, and 2x2 grid of first 4 movie posters
- Increased height (h-80) for better poster visibility
- Movie count badge
- Click to navigate to vault detail page

**CreateVaultModal.tsx** (`src/components/vault/`)
- Name input (required)
- Description textarea (optional)
- Validates against duplicate names
- Creates new vault

**EditVaultModal.tsx** (`src/components/vault/`)
- Edit vault name/description
- Delete vault with confirmation dialog
- Shows delete warning UI

**AddToVaultModal.tsx** (`src/components/vault/`)
- TMDB search integration (clone of AddToWatchlistModal)
- Movie selection with poster preview
- Add to specific vault workflow
- Checks for duplicates within vault

**VaultMovieModal.tsx** (`src/components/vault/`)
- Display vault movie details (for movies NOT in collection)
- Three tabs: Overview, Details, Media
- Shows TMDB info, director, runtime, genres
- "In Collection" badge if movie exists in user's watched collection
- Media tab: Shows trailer (embedded YouTube) and poster grid
- Remove from vault option

#### Smart Modal Selection Pattern

Vault detail page uses intelligent modal routing based on collection status:

```typescript
const handleMovieClick = (movie: VaultMovieWithCollectionStatus) => {
  if (movie.in_collection && movie.collection_movie_id) {
    // Movie is in collection - use full MovieDetailsModal with all user data
    setSelectedCollectionMovieId(movie.collection_movie_id);
    setIsCollectionModalOpen(true);
  } else {
    // Movie only in vault - use simpler VaultMovieModal
    setSelectedMovie(movie);
    setIsMovieModalOpen(true);
  }
};
```

**Benefits:**
- Full editing capabilities for watched movies (ratings, notes, tags)
- Simple preview for unwatched vault movies
- Seamless UX transition as movies move from vault to collection

#### Vaults Page (`/vaults`)
- Grid layout of vault cards
- Search/filter vaults by name or description
- "Create New Vault" button with modal
- Empty state with call-to-action

#### Vault Detail Page (`/vaults/[id]`)
- Movie grid showing all vault movies
- Search/filter movies within vault
- "Add Movie" button with TMDB search modal
- Smart modal selection based on collection status
- Edit vault button (opens EditVaultModal)

### Multi-User Data Isolation

**Critical Pattern:** Vault API routes ensure proper data isolation:

```typescript
// GET /api/vaults/[id]
const vault = await prisma.vault.findUnique({
  where: {
    id: vaultId,
    user_id: user.id  // ⚠️ CRITICAL: Only return vault if owned by user
  },
  include: { movies: true }
});

// Check if vault movies are in THIS USER's collection
const userMovies = await prisma.userMovie.findMany({
  where: {
    user_id: user.id,  // ⚠️ Filter by current user
    movie: {
      tmdb_id: { in: vault.movies.map(m => m.tmdb_id) }
    }
  },
  include: { movie: { select: { tmdb_id: true, id: true } } }
});
```

### Integration with Main Collection

**Adding Vault Movie to Collection:**

The `/api/movies` POST endpoint handles vault-to-collection migration with proper multi-user support:

```typescript
// 1. Check if THIS USER already has movie in their collection
const existingUserMovie = await prisma.userMovie.findFirst({
  where: {
    user_id: user.id,
    movie: { tmdb_id: tmdbId, approval_status: 'approved' }
  }
});

if (existingUserMovie) {
  return NextResponse.json({
    error: 'Movie already exists in your collection'
  }, { status: 409 });
}

// 2. Check if movie exists in global Movie table (from vaults or other users)
const existingMovie = await prisma.movie.findUnique({
  where: { tmdb_id: tmdbId }
});

// 3. Reuse existing Movie record OR create new
if (existingMovie && existingMovie.approval_status === 'approved') {
  // Reuse existing Movie record
  movie = existingMovie;
} else {
  // Fetch from TMDB and create new Movie record
  const movieDetails = await tmdb.getMovieDetails(tmdbId);
  movie = await prisma.movie.create({ data: { ...movieDetails } });
}

// 4. Create UserMovie to link to this user's collection
await prisma.userMovie.create({
  data: {
    movie_id: movie.id,
    user_id: user.id,
    // ... personal data
  }
});
```

**Key Benefits:**
- Prevents duplicate Movie records across users
- Maintains proper data isolation (UserMovie per user)
- Efficient database usage (shared Movie data, user-specific tracking)

### Performance Considerations
- **Efficient Filtering:** User-scoped WHERE clauses in all queries
- **TMDB Integration:** Reuses existing TMDB client (`/lib/tmdb.ts`)
- **Preview Optimization:** VaultCard only loads first 4 posters
- **State Management:** Optimized re-renders with proper dependency arrays
- **Collection Status Check:** Single joined query instead of N+1

### Bug Fixes (January 2025)

**Multi-User Data Isolation Issues:**

1. **Search API "In Collection" Bug** (`/api/search/movies`)
   - **Problem:** Checked global Movie table, showing movies from other users as "In Collection"
   - **Fix:** Changed to check UserMovie table filtered by current user
   ```typescript
   // BEFORE (Wrong)
   const existingMovieIds = await prisma.movie.findMany({
     where: { tmdb_id: { in: searchResults.map(m => m.id) } }
   });

   // AFTER (Correct)
   const existingUserMovies = await prisma.userMovie.findMany({
     where: {
       user_id: user.id,  // Only check current user's collection
       movie: { tmdb_id: { in: searchResults.map(m => m.id) } }
     }
   });
   ```

2. **Add Movie Duplicate Detection Bug** (`/api/movies` POST)
   - **Problem:** Rejected adding vault movies if they existed in ANY user's collection
   - **Fix:** Check UserMovie first (user-specific), then reuse global Movie record
   - **Result:** Users can add movies from vaults to collection even if other users have them

---

## Multi-User Architecture (January 2025)

### Authentication via Clerk

The application uses [Clerk](https://clerk.com) for authentication, providing:
- **Social Login**: Google OAuth (easily extendable to GitHub, Discord, etc.)
- **Session Management**: Secure JWT-based sessions
- **User Management**: Built-in user profile management
- **Middleware Protection**: Next.js middleware guards all routes

### User Data Isolation

**Core Principle:** Each user only sees their own data. Movies, watchlist items, and user-specific metadata are strictly isolated by user_id.

#### Protected Routes (User-Specific)
```typescript
// Pattern: Filter by current user's ID
const user = await getCurrentUser(); // from @/lib/auth

const movies = await prisma.movie.findMany({
  where: {
    user_movies: {
      some: { user_id: user.id }  // Only this user's movies
    }
  }
});
```

**Implemented Routes:**
- `/api/movies` - Movie collection (filters by user_id)
- `/api/movies/[id]` - Movie details (verifies ownership)
- `/api/movies/[id]/tags` - Tag operations (verifies ownership)
- `/api/watchlist` - Watchlist items (filters by user_id)

#### Public Routes (Shared Data)
```typescript
// No user filtering - accessible to all authenticated users
const oscarData = await prisma.oscarData.findMany({
  where: { ceremony_year: 2024 }
  // No user_id filter - Oscar data is public
});
```

**Public Routes:**
- `/api/oscars/*` - Oscar nominations and winners
- `/api/tmdb/*` - TMDB API proxy
- `/api/search/*` - Movie search functionality

### Authentication Helpers

Located in `/src/lib/auth.ts`:

```typescript
// Get current authenticated user (throws if not logged in)
export async function getCurrentUser(): Promise<User> {
  const { userId } = await auth(); // Clerk session
  if (!userId) throw new Error('Unauthorized');

  const user = await prisma.user.findUnique({
    where: { clerk_id: userId }
  });

  if (!user) throw new Error('User not found in database');
  return user;
}

// Require admin role (for future admin features)
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return user;
}
```

### User Synchronization

**Current:** Manual sync via script (until webhook configured)
```bash
npx tsx scripts/create-clerk-user-manually.ts
```

**Future:** Clerk webhook will automatically create database user records on signup.

### Testing Multi-User Isolation

Comprehensive test script verifies data isolation:
```bash
npx tsx scripts/test-multi-user-isolation.ts
```

Tests verify:
- ✅ User 1's movies (2,412) not visible to User 2
- ✅ User 2's empty collection properly isolated
- ✅ Watchlist items filtered by user
- ✅ Tag operations restricted to movie owners
- ✅ Oscar data remains public (all users can view)

### Environment Variables

Required Clerk configuration:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**→ See [api-auth-patterns.md](./api-auth-patterns.md) for detailed authentication patterns**

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
  name       String
  user_id    Int?     // NULL for global tags, user ID for user-specific tags
  color      String?  // Hex color (#8B5CF6 for Calen)
  icon       String?  // Lucide icon name (Users for Calen)
  created_at DateTime @default(now())
  user       User?    @relation(fields: [user_id], references: [id], onDelete: Cascade)
  movie_tags MovieTag[]
  watchlist_tags WatchlistTag[]

  @@unique([name, user_id])  // Composite unique constraint
  @@index([user_id])
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