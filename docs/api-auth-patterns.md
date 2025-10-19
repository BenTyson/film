# API Route Authentication Patterns

This guide shows how to protect your API routes with Clerk authentication.

## Helper Functions

Location: `/src/lib/auth.ts`

```typescript
import { getCurrentUser, requireAdmin } from '@/lib/auth';
```

## Pattern 1: Require Any Authenticated User

```typescript
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Get current authenticated user (throws if not logged in)
    const user = await getCurrentUser();

    // Now user is authenticated and we have their database record
    // Filter data by user_id to show only their data
    const movies = await prisma.userMovie.findMany({
      where: { user_id: user.id }
    });

    return Response.json({ success: true, data: movies });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return Response.json(
        { success: false, error: 'Please sign in' },
        { status: 401 }
      );
    }

    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Pattern 2: Require Admin Access

```typescript
import { requireAdmin } from '@/lib/auth';

export async function DELETE(request: Request) {
  try {
    // Only admins can delete
    const adminUser = await requireAdmin();

    // Perform admin-only action
    await prisma.movie.delete({ where: { id: movieId } });

    return Response.json({ success: true });
  } catch (error) {
    if (error.message.includes('Forbidden')) {
      return Response.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Pattern 3: Optional Authentication

```typescript
import { getUserIdOrNull } from '@/lib/auth';

export async function GET(request: Request) {
  // Get user ID if logged in, otherwise null
  const userId = await getUserIdOrNull();

  // Build query based on auth state
  const where = userId
    ? { user_movies: { some: { user_id: userId } } }
    : { approval_status: 'approved' }; // Public data only

  const movies = await prisma.movie.findMany({ where });

  return Response.json({ success: true, data: movies });
}
```

## Pattern 4: Multi-User Data Isolation (Critical)

**Problem:** The global `Movie` table is shared across all users. A movie can exist in the `Movie` table from:
- User A's watched collection
- User B's vault
- Any user's watchlist

**Solution:** Always check `UserMovie` table (not `Movie` table) for user-specific status.

### Anti-Pattern ❌ (Wrong - checks global Movie table)

```typescript
// ❌ WRONG: Checking Movie table shows movies from OTHER users
export async function GET(request: NextRequest) {
  const searchResults = await tmdb.searchMovies(query);

  // ❌ This checks global Movie table - includes all users!
  const existingMovies = await prisma.movie.findMany({
    where: {
      tmdb_id: { in: searchResults.map(m => m.id) },
      approval_status: 'approved'
    }
  });

  const existingIds = new Set(existingMovies.map(m => m.tmdb_id));

  // ❌ Shows movies from other users as "In Collection"
  return searchResults.map(movie => ({
    ...movie,
    already_in_collection: existingIds.has(movie.id)
  }));
}
```

### Correct Pattern ✅ (checks UserMovie table)

```typescript
// ✅ CORRECT: Check UserMovie table filtered by current user
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(); // Get authenticated user
  const searchResults = await tmdb.searchMovies(query);

  // ✅ Check THIS USER's collection via UserMovie table
  const existingUserMovies = await prisma.userMovie.findMany({
    select: {
      movie: { select: { tmdb_id: true } }
    },
    where: {
      user_id: user.id,  // ⚠️ CRITICAL: Filter by current user
      movie: {
        tmdb_id: { in: searchResults.map(m => m.id) }
      }
    }
  });

  const existingIds = new Set(
    existingUserMovies.map(um => um.movie.tmdb_id)
  );

  // ✅ Only shows movies from THIS user's collection
  return searchResults.map(movie => ({
    ...movie,
    already_in_collection: existingIds.has(movie.id)
  }));
}
```

### Pattern 4b: Duplicate Detection with Movie Reuse

When adding movies to collection, check `UserMovie` for duplicates but reuse global `Movie` records:

```typescript
// ✅ CORRECT: Check UserMovie for duplicates, reuse Movie records
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const { tmdb_id } = await request.json();

  // Step 1: Check if THIS USER already has this movie
  const existingUserMovie = await prisma.userMovie.findFirst({
    where: {
      user_id: user.id,  // ⚠️ Check current user only
      movie: {
        tmdb_id: parseInt(tmdb_id),
        approval_status: 'approved'
      }
    }
  });

  if (existingUserMovie) {
    return NextResponse.json({
      error: 'Movie already exists in your collection'
    }, { status: 409 });
  }

  // Step 2: Check if movie exists in global Movie table
  const existingMovie = await prisma.movie.findUnique({
    where: { tmdb_id: parseInt(tmdb_id) }
  });

  let movie;

  // Step 3: Reuse existing Movie OR create new
  if (existingMovie && existingMovie.approval_status === 'approved') {
    movie = existingMovie; // ✅ Reuse from vaults/other users
  } else {
    // Fetch from TMDB and create new Movie record
    const movieDetails = await tmdb.getMovieDetails(parseInt(tmdb_id));
    movie = await prisma.movie.create({ data: { ...movieDetails } });
  }

  // Step 4: Create UserMovie to link to THIS user's collection
  await prisma.userMovie.create({
    data: {
      movie_id: movie.id,
      user_id: user.id,
      // ... personal data (rating, notes, etc.)
    }
  });

  return NextResponse.json({ success: true, data: movie });
}
```

**Key Benefits:**
- ✅ Prevents false "already exists" errors across users
- ✅ Maintains proper data isolation (UserMovie per user)
- ✅ Efficient database usage (shared Movie records)
- ✅ Users can add vault movies to collection even if other users have them

## Implementation Status

### ✅ Implemented Routes (User-specific data)
These routes are **PROTECTED** and filter by user_id:
- ✅ `/api/movies` - Filters user_movies by current user (Pattern 4b - reuses Movie records)
- ✅ `/api/movies/[id]` - Verifies user ownership
- ✅ `/api/movies/[id]/tags` - POST/DELETE requires ownership
- ✅ `/api/watchlist` - Filters by user_id
- ✅ `/api/vaults` - Filters vaults by user_id
- ✅ `/api/vaults/[id]` - Verifies vault ownership
- ✅ `/api/vaults/[id]/movies` - POST checks vault ownership
- ✅ `/api/search/movies` - Pattern 4 - checks UserMovie for "In Collection" status

### ⏸️ Pending Routes (Mutation operations)
These routes should verify ownership:
- ⏸️ `/api/movies/[id]/update-tmdb` - PUT requires ownership
- ⏸️ `/api/watchlist/[id]` - PUT/DELETE requires ownership

### 🔒 Admin Routes (Not yet implemented)
These routes need admin check:
- 🔒 `/api/movies/migrate-approval` - Admin only
- 🔒 `/api/oscars/import` - Admin only
- 🔒 `/api/oscars/integrate` - Admin only

### ✅ Public Routes (No auth needed - by design)
- ✅ `/api/oscars/*` - Public Oscar data (all users can view)
- ✅ `/api/tmdb/*` - TMDB proxy (public)
- ✅ `/api/search/*` - Search functionality

## Testing Authentication

### Automated Test Script

Run the comprehensive multi-user isolation test:

```bash
npx tsx scripts/test-multi-user-isolation.ts
```

This script verifies:
- ✅ Movie collection isolation (User 1: 2,412 movies, User 2: 0 movies)
- ✅ Watchlist isolation (User 1: 10 items, User 2: 0 items)
- ✅ UserMovie records isolation
- ✅ Tag access control and ownership verification
- ✅ Oscar data remains public (not filtered by user)

### Manual Testing

Test authentication manually using browser dev tools:

```bash
# Without auth (middleware will redirect to sign-in)
curl http://localhost:3000/api/movies

# With auth (get session token from browser dev tools → Application → Cookies)
curl http://localhost:3000/api/movies \
  -H "Cookie: __session=YOUR_SESSION_TOKEN"
```

### Expected Results

**User 1 (ideaswithben@gmail.com):**
- Can see all 2,412 movies in collection
- Can see 10 watchlist items
- Can add/remove tags from owned movies

**User 2 (tyson.ben@gmail.com):**
- Empty collection (0 movies)
- Empty watchlist (0 items)
- Cannot access User 1's movie details (403 Forbidden)
- Cannot modify User 1's movie tags (403 Forbidden)

**Both Users:**
- Can view Oscar data (public routes)
- Can search TMDB (public routes)

## Example: Updating /api/movies

Before:
```typescript
export async function GET(request: NextRequest) {
  const where: any = {
    approval_status: 'approved'
  };

  // ... rest of query
}
```

After:
```typescript
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(); // Add this

  const where: any = {
    approval_status: 'approved',
    user_movies: {              // Add this
      some: {                   // Add this
        user_id: user.id        // Add this
      }                         // Add this
    }                           // Add this
  };

  // ... rest of query
}
```

## Next Steps

1. ⏸️ Configure webhook in Clerk dashboard for automatic user sync
2. ⏸️ Protect remaining mutation routes (`/api/watchlist/[id]`, `/api/movies/[id]/update-tmdb`)
3. 🔒 Implement admin-only routes with `requireAdmin()`
4. ✅ Update frontend error handling (401/403 errors)
