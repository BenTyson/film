# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal movie tracking web application built with Next.js, designed to track and manage a collection of ~3000+ movies with premium streaming service-quality UI/UX.

## Key Features
- Visual movie library with poster grid layout
- Oscar nominations and wins tracking with dedicated pages
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
- **oscar_data**: Academy Award nominations and wins
- **tags**: Watch buddy tags (Calen, Solo, Family, etc.)
- **movie_tags**: Many-to-many relationship for tagging movies

## API Integration

### TMDB API
- Primary source for movie metadata, posters, and backdrops
- Rate limited - implement caching for production use
- API key stored in environment variables

### Environment Variables Required
```bash
TMDB_API_KEY=your_tmdb_api_key
DATABASE_URL=your_postgresql_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

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
- Statistics dashboard (movies per year, ratings distribution)
- Recommendation engine based on viewing history
- Social features for sharing lists with other users
- Advanced search with multiple filter combinations
- Import/export functionality for backup and sharing