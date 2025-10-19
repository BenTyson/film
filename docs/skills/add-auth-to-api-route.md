# Add Authentication to API Route

Step-by-step pattern for adding Clerk authentication to a Next.js API route.

## Quick Pattern

```typescript
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 1. Get authenticated user (throws if not logged in)
    const user = await getCurrentUser();

    // 2. Filter queries by user.id
    const data = await prisma.someModel.findMany({
      where: {
        user_id: user.id  // Only this user's data
      }
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    // Handle auth errors
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Please sign in' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Implementation Steps

### Step 1: Import Authentication Helper

```typescript
import { getCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
```

### Step 2: Add Authentication Check

At the start of your handler function:

```typescript
const user = await getCurrentUser();
```

This will:
- Get the current Clerk session
- Look up the user in the database
- Throw an error if not authenticated or not in database

### Step 3: Filter by User ID

For **user-specific data**, always filter by `user.id`:

```typescript
// ✅ Correct - filters by current user
const movies = await prisma.movie.findMany({
  where: {
    user_movies: {
      some: { user_id: user.id }
    }
  }
});

// ❌ Wrong - shows all users' data
const movies = await prisma.movie.findMany({
  where: { approval_status: 'approved' }
});
```

### Step 4: Verify Ownership for Mutations

For **POST/PUT/DELETE** operations, verify the user owns the resource:

```typescript
export async function DELETE(request: NextRequest, { params }) {
  const user = await getCurrentUser();
  const { id } = await params;

  // Find the resource
  const resource = await prisma.movie.findUnique({
    where: { id: parseInt(id) },
    include: {
      user_movies: {
        where: { user_id: user.id }
      }
    }
  });

  // Verify ownership
  if (!resource || resource.user_movies.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    );
  }

  // Proceed with deletion
  await prisma.movie.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
```

### Step 5: Handle Errors

```typescript
catch (error) {
  console.error('Error:', error);

  // Authentication errors
  if (error.message === 'Unauthorized') {
    return NextResponse.json(
      { success: false, error: 'Please sign in' },
      { status: 401 }
    );
  }

  if (error.message === 'User not found in database') {
    return NextResponse.json(
      { success: false, error: 'User not synced' },
      { status: 401 }
    );
  }

  // Generic error
  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  );
}
```

## Before/After Example

### Before (No Authentication)

```typescript
export async function GET(request: NextRequest) {
  const movies = await prisma.movie.findMany({
    where: { approval_status: 'approved' },
    include: { user_movies: true }
  });

  return NextResponse.json({ success: true, data: movies });
}
```

### After (With Authentication & User Filtering)

```typescript
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    // Filter by user_id
    const movies = await prisma.movie.findMany({
      where: {
        approval_status: 'approved',
        user_movies: {
          some: { user_id: user.id }  // Only this user's movies
        }
      },
      include: {
        user_movies: {
          where: { user_id: user.id }  // Only this user's data
        }
      }
    });

    return NextResponse.json({ success: true, data: movies });
  } catch (error) {
    console.error('Error fetching movies:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Please sign in' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch movies' },
      { status: 500 }
    );
  }
}
```

## Route Status Reference

### ✅ Protected (User-Specific)
- `/api/movies` - Main collection
- `/api/movies/[id]` - Movie details
- `/api/movies/[id]/tags` - Tag operations
- `/api/watchlist` - Watchlist items

### ⏸️ Pending Protection
- `/api/movies/[id]/update-tmdb` - Needs ownership check
- `/api/watchlist/[id]` - Needs ownership check

### 🔒 Admin Only (Future)
- `/api/movies/migrate-approval`
- `/api/oscars/import`
- `/api/oscars/integrate`

### ✅ Public (No Auth Needed)
- `/api/oscars/*` - Oscar data (public by design)
- `/api/tmdb/*` - TMDB proxy
- `/api/search/*` - Search

## Testing

After adding authentication:

1. **Test the authenticated flow:**
   ```bash
   # Login via browser, then test API
   curl http://localhost:3000/api/movies \
     -H "Cookie: __session=YOUR_SESSION_TOKEN"
   ```

2. **Run isolation tests:**
   ```bash
   npx tsx scripts/test-multi-user-isolation.ts
   ```

## Related Documentation

- [api-auth-patterns.md](../api-auth-patterns.md) - Complete authentication patterns
- [architecture.md § Multi-User Architecture](../architecture.md#multi-user-architecture-january-2025) - System design
- [test-multi-user-auth.md](./test-multi-user-auth.md) - Testing isolation
