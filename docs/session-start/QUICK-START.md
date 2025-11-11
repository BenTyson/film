# Film Project Quick-Start Guide

**Last Updated:** January 2025

Welcome! This guide provides rapid orientation to the Film project codebase. Read this first, then follow signposts to specialized documentation for deeper dives.

---

## 1. What Is This?

A personal movie tracking web application for managing a collection of 3000+ movies with premium streaming service-quality UI/UX. Built with Next.js, this app tracks watched movies, Oscar nominations, watchlist items, and "buddy" viewing companions (like Calen). Features a dark futuristic theme with cinematic backgrounds, glass morphism effects, and smooth animations.

**Current Status:** Production-ready with active development. Next major update: Authentication/Login system.

---

## 2. Tech Stack at a Glance

### Frontend
- **Next.js 15** with App Router
- **React 19** + **TypeScript**
- **Tailwind CSS** (dark theme, custom animations)
- **Framer Motion** (premium animations)
- **Radix UI** (accessible components)
- **Lucide React** (iconography)

### Backend & Database
- **Prisma ORM** with **PostgreSQL** (hosted on Railway)
- **TMDB API** for movie data, posters, metadata, streaming availability
- **Clerk** for authentication and user management
- 12 database models
- 42 API endpoints
- 66+ source files

### Deployment
- **Railway** for hosting and database
- Automatic deployments from GitHub
- Environment-based configuration

---

## 3. Major Features

### Movie Collection
- Visual library with poster grid layout
- Advanced filtering: year, rating, genre, Oscar status
- Sorting: date watched, title, release date, rating
- Search with debouncing
- TMDB integration for metadata and imagery
- **Streaming Availability:** View where movies are available to watch (Netflix, Hulu, etc.) with dedicated "Streaming" tab in movie modals

### Oscar Tracking
Comprehensive Academy Award tracking system (1928-2025)
- **1,152 unique Oscar movies** (TMDB ID mapping in progress)
- **2,074 nominations** across 97 ceremony years
- **4 core categories**: Best Picture, Best Actor, Best Actress, Best Director
- **Table view interface**: Primary tool for data validation (sortable, filterable)
- **Grid view interface**: Visual browsing with posters (once TMDB IDs mapped)
- Year navigation with decade grouping

**Current Status (November 2024):** Data freshly imported from clean CSV source. TMDB ID mapping is next priority.

**→ Detailed architecture and rebuild status in [oscars.md](../oscars.md)**

### Watchlist
Mood-based movie watchlist system (separate from main collection)
- TMDB integration for adding movies
- User-specific tags: Each user creates and sees only their own tags
- Custom tag creation: Users can add their own tags via input field + Add button
- Dedicated watchlist page at `/watchlist`
- Tag-based filtering and organization
- Quick remove button in movie modal for easy cleanup
- Complete tag privacy: Tags are isolated per user

**→ See [architecture.md § Watchlist](../architecture.md#watchlist-feature-october-2024) for detailed architecture**

### Vaults
Custom movie collection system for organizing films into thematic collections
- Create named vaults (e.g., "Best Action Films", "Childhood Favorites")
- TMDB integration for adding movies
- Movies don't need to be in watched collection
- "In Collection" badge shows if vault movie is in your watched collection
- Smart modal selection: full details for watched movies, preview for unwatched
- Dedicated vaults listing at `/vaults` and detail pages at `/vaults/[id]`
- User-specific vaults with multi-user data isolation

**→ See [architecture.md § Vaults](../architecture.md#vaults-feature-october-2024) for detailed architecture**

### Buddy System
Tag-based collections for tracking movies watched with specific people
- "Calen" buddy page with dedicated filtering
- Tag any movie with buddy names
- Year counts and statistics per buddy
- Add to buddy collection via modal

### Mobile-Responsive Design
- Netflix-quality visual experience
- Glass morphism effects
- Horizontal scrolling rows
- Mobile-first approach

### Next Major Update
**Authentication/Login System** - Planned implementation with NextAuth
- User accounts and sessions
- Protected routes
- Role-based permissions

**→ See [skills/setup-auth.md](../skills/setup-auth.md) for implementation guide**

---

## 4. File Structure

```
/Users/bentyson/film/
├── src/
│   ├── app/                     # Next.js App Router pages & API routes
│   │   ├── page.tsx            # Homepage (main movie collection)
│   │   ├── layout.tsx          # Root layout with navigation
│   │   ├── globals.css         # Global styles, dark theme
│   │   ├── oscars/             # Oscar pages
│   │   │   ├── page.tsx        # Oscar overview with category filter
│   │   │   └── [year]/page.tsx # Year-specific Oscar page
│   │   ├── watchlist/          # Watchlist feature
│   │   │   └── page.tsx        # Watchlist page
│   │   ├── buddy/
│   │   │   └── calen/page.tsx  # Calen buddy collection page
│   │   ├── add-movie/          # Add movie to collection
│   │   ├── import/             # CSV import interface
│   │   └── api/                # 42 API endpoints
│   │       ├── movies/         # Movie CRUD + filtering (12 routes)
│   │       ├── oscars/         # Oscar data (12 routes)
│   │       ├── watchlist/      # Watchlist CRUD (2 routes)
│   │       ├── vaults/         # Vaults CRUD (3 routes)
│   │       ├── tmdb/           # TMDB proxy (4 routes: search, movie, watch-providers, trailer)
│   │       ├── user/           # User role & info (1 route)
│   │       ├── tags/           # Tag management (1 route)
│   │       ├── buddies/        # Buddy presets (1 route)
│   │       ├── import/         # CSV import (4 routes)
│   │       └── search/         # Search utilities (2 routes)
│   ├── components/             # React components
│   │   ├── movie/              # Movie cards, grids, modals (8 files)
│   │   │   ├── MovieCard.tsx
│   │   │   ├── MovieGrid.tsx
│   │   │   ├── MovieDetailsModal.tsx
│   │   │   ├── AddToCalenModal.tsx
│   │   │   └── TrailerPlayer.tsx
│   │   ├── oscar/              # Oscar components
│   │   │   └── EditOscarMovieModal.tsx
│   │   ├── watchlist/          # Watchlist components
│   │   │   ├── AddToWatchlistModal.tsx
│   │   │   └── WatchlistMovieModal.tsx
│   │   ├── layout/             # Layout components
│   │   │   └── Navigation.tsx
│   │   └── ui/                 # Base UI components
│   │       └── TagIcon.tsx
│   ├── lib/                    # Utility functions and clients
│   │   ├── prisma.ts           # Prisma database client
│   │   ├── tmdb.ts             # TMDB API client
│   │   └── utils.ts            # Helper functions (cn, etc.)
│   └── types/                  # TypeScript type definitions
│       ├── movie.ts            # Movie-related types
│       └── api.ts              # API response types
├── prisma/
│   ├── schema.prisma           # Database schema (12 models)
│   ├── migrations/             # Database migration history
│   └── seed.ts                 # Database seeding script
├── scripts/                    # Utility scripts (4 active)
│   ├── import-oscars.js        # Main Oscar data import
│   ├── reset-database.ts       # Database reset utility
│   ├── test-clean-import.ts    # CSV import testing
│   └── check-import-data.ts    # Data verification
├── docs/                       # Documentation
│   ├── session-start/          # Quick onboarding (you are here!)
│   ├── CLAUDE.md               # Main project overview
│   ├── architecture.md         # System architecture details
│   ├── process.md              # Development workflows
│   ├── oscars.md               # Oscar system documentation
│   └── skills/                 # Claude Code skills (4 files)
└── public/                     # Static assets

**Import Pattern:** Use `@/` alias for src imports
Example: `import { prisma } from '@/lib/prisma'`
```

---

## 5. Database Schema Quick Reference

### 12 Core Models

#### Movie Collection
```
Movie (main movies table)
├── tmdb_id (unique, TMDB integration)
├── title, release_date, director, overview
├── poster_path, backdrop_path
├── approval_status (pending/approved workflow)
└── Relationships:
    ├── UserMovie (1:many) - personal tracking data
    ├── MovieTag (many:many via Tag) - buddy tags
    ├── OscarData (1:many) - LEGACY Oscar data
    └── MovieMatchAnalysis (1:1) - import quality tracking

UserMovie (personal tracking)
├── movie_id → Movie
├── user_id → User
├── date_watched, personal_rating
├── notes, is_favorite
└── buddy_watched_with (JSON array: ["Calen", "Morgan"])

Tag (buddy and mood tags)
├── name, color, icon
├── user_id (NULL for global tags, user ID for user-specific)
├── @@unique([name, user_id]) - composite unique constraint
└── Used by: MovieTag, WatchlistTag
```

#### Oscar System (Unified Architecture)
```
OscarCategory (categories master)
├── name (Best Picture, Best Actor, etc.)
├── category_group (Acting, Directing, Technical)
└── OscarNomination (1:many)

OscarMovie (Oscar-specific movies)
├── tmdb_id (unique), imdb_id
├── title
└── OscarNomination (1:many)

OscarNomination (nominations 1928-2025)
├── ceremony_year, category_id, movie_id
├── nominee_name, is_winner
└── Relationships:
    ├── OscarCategory (many:1)
    └── OscarMovie (many:1)
```

#### Watchlist System
```
WatchlistMovie (watchlist items)
├── tmdb_id (unique)
├── title, director, release_date
├── poster_path, overview, runtime
└── WatchlistTag (1:many)

WatchlistTag (mood-based tags)
├── watchlist_movie_id → WatchlistMovie
└── tag_id → Tag (shared with MovieTag)
```

#### Legacy & Utility
```
OscarData (DEPRECATED - use OscarNomination instead)
├── movie_id → Movie (user collection only)
└── ceremony_year, category, is_winner

BestPictureNominee (historical data)
├── ceremony_year, movie_title, tmdb_id
└── is_winner

MovieMatchAnalysis (CSV import quality)
├── movie_id → Movie
└── confidence_score, severity, mismatches
```

**→ Full schema:** `/prisma/schema.prisma`

---

## 6. Common Tasks

### Add a New API Endpoint
1. Create file: `src/app/api/[feature]/route.ts`
2. Export GET, POST, PUT, DELETE handlers
3. Use Prisma for database queries
4. Return standardized JSON: `{ success: boolean, data?: any, error?: string }`

**→ See [architecture.md § API Routes](../architecture.md#api-architecture) for endpoint patterns**

### Database Migration
```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name descriptive_migration_name

# 3. Generate Prisma client
npx prisma generate

# 4. Update TypeScript types in src/types/
```

**→ See [process.md § Database Management](../process.md#database-management) for detailed workflow**
**→ See [skills/database-migration.md](../skills/database-migration.md) for step-by-step guide**

### Oscar Data Import
```bash
# Import from src/data/oscar-nominations.json to unified tables
node scripts/import-oscars.js
```

**→ See [oscars.md § Data Import](../oscars.md#data-import--migration) for details**

### TMDB API Integration
```typescript
import { searchMovies, getMovieDetails } from '@/lib/tmdb';

// Search
const results = await searchMovies('Oppenheimer', 2023);

// Get details
const movie = await getMovieDetails(872585); // tmdb_id
```

**→ See [skills/tmdb-integration.md](../skills/tmdb-integration.md) for patterns and best practices**

### Add a New Feature
Follow the standard pattern: Database → API → Types → Components → Page

**→ See [skills/add-feature.md](../skills/add-feature.md) for complete workflow**

### Deploy to Railway
```bash
# 1. Build locally to test
npm run build

# 2. Push to GitHub main branch
git push origin main

# 3. Railway auto-deploys and runs:
#    - npx prisma migrate deploy
#    - npm run build
#    - npm run start
```

**→ See [process.md § Deployment Process](../process.md#deployment-process) for checklist**

---

## 7. Where to Find More Details

### Core Documentation
- **[CLAUDE.md](../CLAUDE.md)** - Main project overview, tech stack, database schema, development commands
- **[architecture.md](../architecture.md)** - System architecture, component hierarchy, API structure, Watchlist details
- **[process.md](../process.md)** - Development workflows, deployment process, maintenance tasks
- **[oscars.md](../oscars.md)** - Complete Oscar system architecture, database design, API endpoints

### Specialized Guides
- **[skills/add-feature.md](../skills/add-feature.md)** - Template for adding new features
- **[skills/database-migration.md](../skills/database-migration.md)** - Database schema changes
- **[skills/tmdb-integration.md](../skills/tmdb-integration.md)** - TMDB API operations and patterns
- **[skills/setup-auth.md](../skills/setup-auth.md)** - NextAuth implementation guide (for upcoming update)

### Quick Reference by Topic
- **Oscar System** → oscars.md (comprehensive coverage)
- **Watchlist Feature** → architecture.md § Watchlist
- **API Endpoints** → architecture.md § API Architecture
- **Components** → architecture.md § Component Architecture
- **Database Schema** → CLAUDE.md § Database Schema or prisma/schema.prisma
- **Development Workflows** → process.md
- **Common Tasks** → This file (Section 6) or skills/ folder

---

## 8. Documentation Maintenance Guidelines

### For Claude Code Agents

**IMPORTANT:**
- **DO NOT create new .md files without explicit user approval**
- At end of each work session, **proactively identify which docs need updates**
- **List specific files and what changes are needed**, then wait for approval
- **Update only approved documentation files**
- Follow established documentation structure and cross-linking patterns

### For Users

**End-of-Session Workflow:**
1. Ask agent: **"What docs need updating based on today's work?"**
2. Review agent's suggestions (specific files + proposed changes)
3. Approve specific files to update: *"Yes, update architecture.md and process.md"*
4. New .md files require explicit approval

**When to Update Documentation:**
- New features added (API, components, pages)
- Database schema changes
- Major bug fixes or architectural changes
- New workflows or processes established

**Documentation Quality Standards:**
- Keep cross-links updated between docs
- Use signposting (→ See [file.md]) to guide readers
- Maintain consistent structure and tone
- Update "Last Updated" dates when making changes
- Verify accuracy against actual codebase

---

## 9. Next Steps

### Based on Your Task

| If you're working on... | Read this next... |
|------------------------|-------------------|
| **Oscar features** | [oscars.md](../oscars.md) for complete architecture |
| **Watchlist features** | [architecture.md § Watchlist](../architecture.md#watchlist-feature-october-2024) |
| **New components** | [architecture.md § Components](../architecture.md#component-architecture) |
| **API endpoints** | [architecture.md § API Routes](../architecture.md#api-architecture) |
| **Database changes** | [skills/database-migration.md](../skills/database-migration.md) |
| **TMDB integration** | [skills/tmdb-integration.md](../skills/tmdb-integration.md) |
| **Authentication/login** | [skills/setup-auth.md](../skills/setup-auth.md) |
| **General feature** | [skills/add-feature.md](../skills/add-feature.md) |

### General Workflow

1. **Orient** - You just did this! (Read QUICK-START.md)
2. **Explore** - Use Glob/Grep to find relevant files
3. **Deep Dive** - Read specialized docs (oscars.md, architecture.md, etc.)
4. **Implement** - Follow patterns in existing code
5. **Test** - Verify functionality locally
6. **Document** - Update relevant .md files with approval

---

## 10. Project Stats (As of January 2025)

- **Total Source Files:** 66+ TypeScript/TSX files
- **API Endpoints:** 39 routes
- **Database Models:** 12 models
- **Active Scripts:** 4 utility scripts
- **Components:** 15+ reusable components
- **Pages:** 8+ distinct pages/routes
- **Oscar Movies:** 1,158 unique movies
- **Oscar Nominations:** 2,053+ nominations (1928-2025)
- **Documentation Files:** 10 markdown files
- **Authentication:** Multi-user with Clerk (Google OAuth)

---

**Welcome to the Film project! Start exploring and building amazing features.** 🎬
