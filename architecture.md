# System Architecture

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

### Frontend Component Hierarchy

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
│   │       └── Edit Actions
│   ├── Filter Sidebar
│   │   ├── Search Input
│   │   ├── Date Range
│   │   ├── Rating Filter
│   │   ├── Genre Filter
│   │   ├── Oscar Filter
│   │   └── Buddy Filter
│   └── Pagination/Infinite Scroll
└── Footer
```

### Specialized Page Components

```
/oscars
├── Year Selector
├── Category Tabs
├── Nominated Movies Grid
└── Won Movies Grid

/buddy/calen
├── Buddy Header
├── Watch Statistics
├── Shared Movies Grid
└── Timeline View

/add-movie
├── Search Input (TMDB)
├── Movie Results
├── Add Movie Form
└── Quick Add Actions
```

## API Architecture

### Next.js API Routes Structure

```
/api
├── /movies
│   ├── GET /           # List movies with filters
│   ├── POST /          # Add new movie
│   ├── GET /[id]       # Get specific movie
│   ├── PUT /[id]       # Update movie data
│   └── DELETE /[id]    # Remove movie
├── /tmdb
│   ├── GET /search     # Search TMDB for movies
│   ├── GET /movie/[id] # Get TMDB movie details
│   └── GET /credits/[id] # Get movie credits
├── /oscars
│   ├── GET /           # List Oscar data
│   ├── GET /[year]     # Oscars by year
│   └── GET /movie/[id] # Oscar data for movie
├── /tags
│   ├── GET /           # List all tags
│   ├── POST /          # Create new tag
│   └── PUT /[id]       # Update tag
└── /import
    ├── POST /csv       # Import from CSV
    └── GET /status     # Import progress
```

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

## Monitoring & Analytics

### Application Monitoring
- **Error Tracking**: Railway logs and alerts
- **Performance**: Core Web Vitals monitoring
- **Database**: Query performance tracking
- **API**: Response time monitoring

### User Analytics
- **Usage Patterns**: Movie viewing trends
- **Feature Adoption**: Filter usage analytics
- **Performance**: Page load times
- **Errors**: Client-side error tracking