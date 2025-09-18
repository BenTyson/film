# Development Process

## Project Setup & Configuration

### Initial Environment Setup

```bash
# Clone and setup
git clone <repository>
cd film

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Add required variables:
# - TMDB_API_KEY
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL

# Setup database
npx prisma migrate dev
npx prisma generate
npx prisma db seed # When seed script is available
```

### Development Workflow

```bash
# Start development
npm run dev          # Runs on localhost:3000

# Database operations
npx prisma studio    # GUI for database
npx prisma migrate dev --name migration_name
npx prisma db push   # For schema changes without migration

# Code quality
npm run lint         # ESLint
npm run type-check   # TypeScript checking
npm run format       # Prettier formatting
```

## Data Management Process

### Google Sheets Migration Process

1. **Export Current Data**
   ```bash
   # Export Google Sheets as CSV with columns:
   # movie_name, release_date, director, date_watched, rating, notes, buddy
   ```

2. **Run Import Script**
   ```bash
   npm run import:csv -- --file=movies.csv --dry-run
   npm run import:csv -- --file=movies.csv --execute
   ```

3. **Manual Review Process**
   - Review unmatched movies in import logs
   - Manually match ambiguous titles
   - Verify buddy tags are correctly applied
   - Check Oscar data integration

### TMDB API Integration Process

1. **Movie Search & Match**
   ```typescript
   // Search process for CSV import
   const searchResults = await tmdb.searchMovies(movieTitle, releaseYear);
   const bestMatch = findBestMatch(searchResults, originalData);
   ```

2. **Data Enrichment**
   ```typescript
   // Fetch additional data for matched movies
   const movieDetails = await tmdb.getMovieDetails(tmdbId);
   const credits = await tmdb.getMovieCredits(tmdbId);

   // Save to database with personal data
   await saveMovieWithUserData(movieDetails, personalData);
   ```

3. **Oscar Data Integration**
   ```bash
   # Fetch and update Oscar data for existing movies
   npm run oscar:update --year=2024
   npm run oscar:backfill --start-year=1990
   ```

## Database Management

### Schema Migration Process

1. **Schema Changes**
   ```bash
   # Modify prisma/schema.prisma
   npx prisma migrate dev --name descriptive_migration_name
   npx prisma generate
   ```

2. **Data Migration Scripts**
   ```typescript
   // For complex data transformations
   // Create scripts in prisma/migrations/custom/
   export async function migrateMovieGenres() {
     // Custom migration logic
   }
   ```

3. **Backup & Recovery**
   ```bash
   # Create backup before major changes
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

   # Restore if needed
   psql $DATABASE_URL < backup_20241201.sql
   ```

### Database Seeding

```typescript
// prisma/seed.ts
async function seedTags() {
  await prisma.tag.createMany({
    data: [
      { name: 'Calen', color: '#3b82f6', icon: 'Users' },
      { name: 'Solo', color: '#8b5cf6', icon: 'User' },
      { name: 'Family', color: '#10b981', icon: 'Home' },
      { name: 'Date Night', color: '#f59e0b', icon: 'Heart' },
    ]
  });
}
```

## Component Development Process

### Creating New Components

1. **Component Structure**
   ```typescript
   // src/components/movie/MovieCard.tsx
   interface MovieCardProps {
     movie: MovieWithDetails;
     onSelect?: (movie: Movie) => void;
   }

   export function MovieCard({ movie, onSelect }: MovieCardProps) {
     // Component implementation
   }
   ```

2. **Styling Conventions**
   ```tsx
   // Use Tailwind classes with movie-card base class
   <div className="movie-card bg-card rounded-lg overflow-hidden">
     <Image
       src={movie.poster_path}
       alt={movie.title}
       className="w-full aspect-[2/3] object-cover"
     />
   </div>
   ```

3. **Animation Integration**
   ```tsx
   // Use Framer Motion for interactions
   <motion.div
     whileHover={{ scale: 1.05 }}
     transition={{ duration: 0.2 }}
   >
     {/* Component content */}
   </motion.div>
   ```

### Page Development Process

1. **Route Structure**
   ```
   src/app/
   ├── page.tsx                 # Homepage
   ├── oscars/
   │   ├── page.tsx            # Oscars overview
   │   └── [year]/page.tsx     # Oscars by year
   ├── buddy/
   │   └── [name]/page.tsx     # Buddy-specific pages
   └── add-movie/
       └── page.tsx            # Add new movie
   ```

2. **Page Component Pattern**
   ```typescript
   // Server component for data fetching
   export default async function OscarsPage({ params }: { params: { year: string } }) {
     const oscarData = await getOscarsByYear(params.year);
     return <OscarsClient data={oscarData} />;
   }

   // Client component for interactivity
   'use client';
   export function OscarsClient({ data }: { data: OscarData[] }) {
     // Interactive functionality
   }
   ```

## API Development Process

### Creating API Routes

1. **API Route Structure**
   ```typescript
   // src/app/api/movies/route.ts
   export async function GET(request: Request) {
     const { searchParams } = new URL(request.url);
     const page = searchParams.get('page') || '1';

     const movies = await getMovies({ page: parseInt(page) });
     return Response.json({ success: true, data: movies });
   }
   ```

2. **Input Validation**
   ```typescript
   import { z } from 'zod';

   const movieSchema = z.object({
     title: z.string().min(1),
     tmdb_id: z.number().positive(),
     date_watched: z.string().datetime(),
   });

   export async function POST(request: Request) {
     const body = await request.json();
     const validated = movieSchema.parse(body);
     // Process validated data
   }
   ```

3. **Error Handling**
   ```typescript
   try {
     const result = await processMovieData(data);
     return Response.json({ success: true, data: result });
   } catch (error) {
     return Response.json(
       { success: false, error: error.message },
       { status: 500 }
     );
   }
   ```

## Testing Process

### Component Testing

```typescript
// src/components/__tests__/MovieCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MovieCard } from '../MovieCard';

describe('MovieCard', () => {
  it('displays movie title and year', () => {
    const movie = { title: 'Test Movie', release_date: '2024-01-01' };
    render(<MovieCard movie={movie} />);

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
  });
});
```

### API Testing

```typescript
// src/app/api/__tests__/movies.test.ts
import { GET } from '../movies/route';

describe('/api/movies', () => {
  it('returns paginated movies', async () => {
    const request = new Request('http://localhost/api/movies?page=1');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('movies');
    expect(data.data).toHaveProperty('pagination');
  });
});
```

## Deployment Process

### Railway Deployment

1. **Environment Setup**
   ```bash
   # Railway CLI setup
   npm install -g @railway/cli
   railway login
   railway link
   ```

2. **Database Setup**
   ```bash
   # Create PostgreSQL service
   railway add postgresql

   # Run migrations
   railway run npx prisma migrate deploy
   ```

3. **Application Deployment**
   ```bash
   # Deploy from local
   railway up

   # Or configure GitHub auto-deploy
   railway connect # Link to GitHub repository
   ```

### Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Build process successful
- [ ] No TypeScript errors
- [ ] ESLint passing
- [ ] TMDB API key valid
- [ ] Performance optimization applied
- [ ] Error handling implemented

### Post-deployment Verification

1. **Functional Testing**
   - [ ] Homepage loads correctly
   - [ ] Movie search works
   - [ ] TMDB integration functional
   - [ ] Database queries successful
   - [ ] Oscar pages accessible
   - [ ] Buddy filtering works

2. **Performance Testing**
   - [ ] Page load times < 3 seconds
   - [ ] Image loading optimized
   - [ ] Mobile responsiveness
   - [ ] API response times < 500ms

## Maintenance Process

### Regular Maintenance Tasks

1. **Weekly**
   ```bash
   # Update dependencies
   npm update

   # Check for security vulnerabilities
   npm audit

   # Review and optimize database queries
   npx prisma studio
   ```

2. **Monthly**
   ```bash
   # Database maintenance
   VACUUM ANALYZE; # PostgreSQL optimization

   # Review and clean up logs
   railway logs --tail 1000

   # Update Oscar data
   npm run oscar:update
   ```

3. **Quarterly**
   - Review and update TMDB API integration
   - Analyze user behavior and optimize UX
   - Update dependencies to latest stable versions
   - Review and optimize database schema

### Backup Strategy

```bash
# Automated daily backups (Railway handles this)
# Manual backup before major changes
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup restoration process
# 1. Create new database instance
# 2. Restore from backup
# 3. Update connection string
# 4. Verify data integrity
```

### Monitoring & Alerts

1. **Application Monitoring**
   - Railway built-in monitoring
   - Error tracking and alerting
   - Performance metrics
   - Database query monitoring

2. **Custom Metrics**
   ```typescript
   // Track important business metrics
   await trackMetric('movies_added', 1);
   await trackMetric('search_query', searchTerm);
   await trackMetric('buddy_filter_used', buddyName);
   ```

## Troubleshooting Guide

### Common Issues

1. **TMDB API Rate Limiting**
   ```typescript
   // Implement retry logic with exponential backoff
   const retryWithBackoff = async (fn: Function, retries = 3) => {
     try {
       return await fn();
     } catch (error) {
       if (retries > 0 && error.status === 429) {
         await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
         return retryWithBackoff(fn, retries - 1);
       }
       throw error;
     }
   };
   ```

2. **Database Connection Issues**
   ```bash
   # Check connection
   npx prisma db ping

   # Reset connection pool
   railway restart
   ```

3. **Build Failures**
   ```bash
   # Clear Next.js cache
   rm -rf .next

   # Regenerate Prisma client
   npx prisma generate

   # Check TypeScript errors
   npx tsc --noEmit
   ```

### Performance Issues

1. **Slow Movie Grid Loading**
   - Implement virtualization for large lists
   - Optimize image loading with proper sizing
   - Add pagination or infinite scroll

2. **Database Query Optimization**
   ```sql
   -- Add indexes for common queries
   CREATE INDEX CONCURRENTLY idx_user_movies_date_watched_desc
   ON user_movies(date_watched DESC);
   ```

3. **TMDB API Response Optimization**
   - Implement proper caching strategy
   - Batch multiple requests when possible
   - Use appropriate image sizes