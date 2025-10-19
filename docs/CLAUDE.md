# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Maintenance Guidelines

**IMPORTANT for Claude Code agents:**
- **Never create new markdown files without explicit user approval**
- At the end of each session, **proactively suggest which docs need updates**
- **List specific files and what changes are needed**, then wait for approval
- **Update only approved documentation files**
- Follow established documentation structure and cross-linking patterns

**For quick orientation:** Read `docs/session-start/QUICK-START.md` first for rapid onboarding.

---

## Project Overview

This is a personal movie tracking web application built with Next.js, designed to track and manage a collection of ~3000+ movies with premium streaming service-quality UI/UX.

## Key Features
- Visual movie library with poster grid layout
- Oscar nominations and wins tracking with dedicated pages (1928-2025, 1,158+ movies, 2,053+ nominations)
- **Watchlist** with mood-based tagging (Morgan, Liam, Epic, Scary, Indie) - separate from main collection
- "Buddy system" for tracking movies watched with specific people (e.g., Calen)
- Dark theme with futuristic aesthetic
- Mobile-responsive design
- Integration with TMDB API for movie data and imagery

## Technology Stack

### Frontend
- **Next.js 14+** with App Router and TypeScript
- **Tailwind CSS** with custom dark theme and animations
- **Framer Motion** for premium animations and transitions
- **Radix UI** primitives for accessible components
- **Lucide React** for consistent iconography

### Backend & Database
- **Prisma ORM** with PostgreSQL database
- **Railway** for hosting and database deployment
- **TMDB API** for movie data, posters, and metadata

### UI/UX Design Philosophy
- Netflix-quality visual experience with cinematic backgrounds
- Glass morphism effects and smooth transitions
- Horizontal scrolling rows for content organization
- Hover effects and micro-interactions
- Mobile-first responsive design

## Common Development Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000
npm run build        # Build production application
npm run start        # Start production server
npm run lint         # Run ESLint for code quality

# Database
npx prisma generate  # Generate Prisma client
npx prisma migrate dev # Run database migrations
npx prisma studio    # Open Prisma database GUI
npx prisma db push   # Push schema to database

# Testing (when implemented)
npm run test         # Run test suite
```

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── globals.css     # Global styles with dark theme
│   ├── layout.tsx      # Root layout component
│   └── page.tsx        # Homepage
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components (Radix + Tailwind)
│   ├── movie/         # Movie-specific components
│   └── layout/        # Layout components
├── lib/               # Utility functions and configurations
│   ├── prisma.ts      # Prisma client configuration
│   ├── tmdb.ts        # TMDB API client
│   └── utils.ts       # General utilities
└── types/             # TypeScript type definitions

prisma/
├── schema.prisma      # Database schema
└── migrations/        # Database migration files
```

## Database Schema Overview

### Core Tables
- **movies**: TMDB movie data (title, director, release_date, poster_url, etc.)
- **user_movies**: Personal tracking data (date_watched, rating, notes)
- **oscar_data**: Academy Award nominations and wins (LEGACY - see unified Oscar system below)
- **tags**: Watch buddy tags (Calen, Solo, Family, etc.) and mood tags (shared with watchlist)
- **movie_tags**: Many-to-many relationship for tagging movies
- **watchlist_movies**: Separate watchlist items with TMDB data
- **watchlist_tags**: Many-to-many relationship for watchlist mood tags

### Oscar System (Unified Architecture)
- **oscar_categories**: Oscar category master data (Best Picture, Best Actor, etc.)
- **oscar_movies**: Oscar-specific movie records with TMDB IDs
- **oscar_nominations**: Complete historical data (1928-2025, 2,053+ nominations)

**→ See [oscars.md](./oscars.md) for complete Oscar system architecture**

### Utility Tables
- **movie_match_analysis**: CSV import quality tracking
- **best_picture_nominees**: Historical Best Picture data

## API Integration

### TMDB API
- Primary source for movie metadata, posters, and backdrops
- Rate limited - implement caching for production use
- API key stored in environment variables

### Environment Variables Required
```bash
TMDB_API_KEY=your_tmdb_api_key
DATABASE_URL=your_postgresql_connection_string
```

**Note:** NextAuth configuration (NEXTAUTH_SECRET, NEXTAUTH_URL) planned for future authentication/login update.

## Development Guidelines

### Styling Conventions
- Use Tailwind CSS utility classes
- Leverage custom CSS variables for theming
- Implement glass morphism with `.glass` utility class
- Use `movie-card` class for hover animations
- Maintain mobile-first responsive design

### Component Patterns
- Use Radix UI primitives for accessibility
- Implement proper TypeScript interfaces
- Follow Next.js App Router conventions
- Use Framer Motion for complex animations

### Performance Considerations
- Implement image optimization for movie posters
- Use Next.js Image component with priority loading
- Consider virtualization for large movie lists
- Cache TMDB API responses

## Data Management

### Google Sheets Migration
- Export existing movie data as CSV
- Use import script to match with TMDB API
- Preserve personal ratings, notes, and watch dates
- Tag movies with appropriate buddies during import

### Buddy System
- "Calen" tag for movies watched together
- Filterable pages for each watch companion
- Flexible tagging system for multiple buddies

### Oscar Integration
- Dedicated Oscar pages by year and category
- Visual badges for nominations vs. wins
- Filter movies by Oscar status

## Deployment

### Railway Deployment
- Database: PostgreSQL on Railway
- Application: Deploy from GitHub repository
- Environment variables configured in Railway dashboard
- Automatic deployments on main branch pushes

## Future Enhancements

### Next Major Update: Authentication/Login System
- User accounts and sessions (NextAuth.js)
- Protected routes and role-based permissions
- Multi-user support for shared collections

**→ See [skills/setup-auth.md](./skills/setup-auth.md) for implementation guide**

### Additional Planned Features
- Statistics dashboard (movies per year, ratings distribution)
- Recommendation engine based on viewing history
- Social features for sharing lists with other users
- Advanced search with multiple filter combinations
- Import/export functionality for backup and sharing

---

## Related Documentation

- **Quick Start:** [session-start/QUICK-START.md](./session-start/QUICK-START.md) - Rapid orientation guide
- **Architecture:** [architecture.md](./architecture.md) - Detailed system architecture, components, API structure
- **Oscar System:** [oscars.md](./oscars.md) - Complete Oscar tracking system documentation
- **Development Process:** [process.md](./process.md) - Workflows, deployment, maintenance
- **Skills:** [skills/](./skills/) - Claude Code skills for common tasks