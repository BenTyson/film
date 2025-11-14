# Activity Logging Skill

Guide for implementing activity tracking across the application using the ActivityLog system.

## Overview

Activity logging tracks user actions throughout the application for:
- **Admin Monitoring:** View what users are doing
- **Debugging:** Understand user workflows and issues
- **Analytics:** Track feature usage and adoption
- **Audit Trail:** Compliance and security tracking

---

## Activity Logger API

### Import

```typescript
import { logActivity } from '@/lib/activity-logger';
```

### Function Signature

```typescript
export async function logActivity({
  userId,
  actionType,
  targetType,
  targetId,
  metadata,
  ipAddress,
  userAgent,
}: ActivityLogParams): Promise<void>
```

### Parameters

```typescript
interface ActivityLogParams {
  userId: number;              // User performing action
  actionType: ActivityType;    // Type of action (see below)
  targetType?: string | null;  // Type of entity affected (movie, vault, etc.)
  targetId?: number | null;    // ID of affected entity
  metadata?: Record<string, string | number | boolean | null>; // Additional context
  ipAddress?: string;          // User's IP address
  userAgent?: string;          // Browser user agent
}
```

---

## Action Types

All 15 available activity types:

```typescript
type ActivityType =
  | 'movie_added'         // User added movie to collection
  | 'movie_updated'       // User updated movie details
  | 'movie_removed'       // User removed movie from collection
  | 'csv_import'          // User imported movies from CSV
  | 'watchlist_added'     // User added movie to watchlist
  | 'watchlist_removed'   // User removed movie from watchlist
  | 'vault_created'       // User created new vault
  | 'vault_updated'       // User updated vault details
  | 'vault_deleted'       // User deleted vault
  | 'vault_movie_added'   // User added movie to vault
  | 'vault_movie_removed' // User removed movie from vault
  | 'tag_created'         // User created new tag
  | 'movie_tagged'        // User tagged movie with buddy/mood tag
  | 'user_login';         // User signed in
```

---

## Basic Implementation

### Simple Activity Log

```typescript
import { logActivity } from '@/lib/activity-logger';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    // Perform operation
    const movie = await prisma.movie.create({
      data: { /* ... */ }
    });

    // Log activity
    await logActivity({
      userId: user.id,
      actionType: 'movie_added',
    });

    return NextResponse.json({ success: true, data: movie });
  } catch (error) {
    // Handle error
  }
}
```

### With Target Information

```typescript
await logActivity({
  userId: user.id,
  actionType: 'movie_removed',
  targetType: 'movie',
  targetId: movie.id,
});
```

### With Metadata

```typescript
await logActivity({
  userId: user.id,
  actionType: 'movie_added',
  targetType: 'movie',
  targetId: movie.id,
  metadata: {
    title: movie.title,
    tmdb_id: movie.tmdb_id,
    release_year: movie.release_date?.getFullYear(),
  },
});
```

---

## Advanced Implementation

### CSV Import with Count

```typescript
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    // Import movies
    const importedMovies = await importMoviesFromCSV(data);

    // Log import with count
    await logActivity({
      userId: user.id,
      actionType: 'csv_import',
      targetType: 'import',
      targetId: null,
      metadata: {
        count: importedMovies.length,
        file_name: 'movies.csv',
        success_count: importedMovies.filter(m => m.success).length,
        error_count: importedMovies.filter(m => !m.success).length,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle error
  }
}
```

### Vault Movie Addition

```typescript
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const { vault_id, tmdb_id } = await request.json();

    // Add movie to vault
    const vaultMovie = await prisma.vaultMovie.create({
      data: { vault_id, tmdb_id }
    });

    // Get vault and movie details for metadata
    const vault = await prisma.vault.findUnique({
      where: { id: vault_id }
    });
    const movie = await getMovieDetails(tmdb_id);

    // Log activity
    await logActivity({
      userId: user.id,
      actionType: 'vault_movie_added',
      targetType: 'vault',
      targetId: vault_id,
      metadata: {
        vault_name: vault.name,
        movie_title: movie.title,
        tmdb_id: tmdb_id,
      },
    });

    return NextResponse.json({ success: true, data: vaultMovie });
  } catch (error) {
    // Handle error
  }
}
```

### Movie Tagging

```typescript
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const { movie_id, tag_id } = await request.json();

    // Tag movie
    const movieTag = await prisma.movieTag.create({
      data: { movie_id, tag_id }
    });

    // Get tag and movie for metadata
    const [tag, movie] = await Promise.all([
      prisma.tag.findUnique({ where: { id: tag_id } }),
      prisma.movie.findUnique({ where: { id: movie_id } })
    ]);

    // Log activity
    await logActivity({
      userId: user.id,
      actionType: 'movie_tagged',
      targetType: 'movie',
      targetId: movie_id,
      metadata: {
        title: movie.title,
        tag: tag.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle error
  }
}
```

### User Login Tracking

```typescript
// src/app/api/auth/callback/route.ts
export async function GET(request: Request) {
  try {
    const { userId } = auth();

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { clerk_id: userId }
      });

      if (user) {
        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { last_login_at: new Date() }
        });

        // Log login activity
        await logActivity({
          userId: user.id,
          actionType: 'user_login',
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        });
      }
    }

    return NextResponse.redirect('/');
  } catch (error) {
    // Handle error
  }
}
```

---

## Request Metadata Helper

Extract IP and user agent from request:

```typescript
import { getRequestMetadata } from '@/lib/activity-logger';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const requestMeta = getRequestMetadata(request);

  await logActivity({
    userId: user.id,
    actionType: 'movie_added',
    ...requestMeta, // Includes ipAddress and userAgent
  });
}
```

**Implementation:**
```typescript
// src/lib/activity-logger.ts
export function getRequestMetadata(request: Request) {
  return {
    ipAddress: request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  };
}
```

---

## Metadata Best Practices

### What to Include

**✅ DO include:**
- Identifying information (title, name, ID)
- Counts and quantities (number of items imported)
- Status information (success/failure counts)
- Relevant context (vault name, tag name)
- User-facing values (dates, ratings)

**❌ DON'T include:**
- Sensitive data (passwords, tokens, API keys)
- Large objects or arrays
- Redundant information already tracked (user_id)
- Internal implementation details
- Binary data or file contents

### Examples

**Good Metadata:**
```typescript
// Movie addition
metadata: {
  title: "Oppenheimer",
  tmdb_id: 872585,
  release_year: 2023,
  personal_rating: 10
}

// CSV import
metadata: {
  count: 150,
  file_name: "movies_backup.csv",
  success_count: 145,
  error_count: 5
}

// Vault creation
metadata: {
  name: "Best of 2023",
  description: "My favorite films from 2023"
}
```

**Bad Metadata:**
```typescript
// Too large
metadata: {
  entire_movie_object: { /* huge object */ }
}

// Sensitive
metadata: {
  api_key: "sk_test_...",
  password: "..."
}

// Redundant
metadata: {
  user_id: user.id, // Already tracked in ActivityLog
  user_email: user.email // Not needed
}
```

---

## Error Handling

### Non-Blocking Logging

`logActivity()` **never throws errors** to prevent breaking user operations:

```typescript
export async function logActivity(params: ActivityLogParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { /* ... */ }
    });
  } catch (error) {
    // Log to console but don't throw
    console.error('Failed to log activity:', error);
  }
}
```

**Why:** Activity logging is secondary to user operations. If logging fails, the user's action should still succeed.

### Handling Failed Logs

If activity logging fails:
1. Error logged to console for debugging
2. User operation continues normally
3. Admin can investigate console logs or database errors

**To debug:**
```bash
# Check application logs
heroku logs --tail # or Railway logs

# Check database connectivity
npx prisma db ping

# Verify ActivityLog table exists
npx prisma db pull
```

---

## Database Schema

### ActivityLog Model

```prisma
model ActivityLog {
  id          Int      @id @default(autoincrement())
  user_id     Int
  action_type String
  target_type String?
  target_id   Int?
  metadata    Json?
  ip_address  String?
  user_agent  String?
  created_at  DateTime @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([action_type])
  @@index([created_at])
  @@map("activity_logs")
}
```

### Indexes

**Why indexed:**
- `user_id` - Fast filtering by user
- `action_type` - Fast filtering by action
- `created_at` - Fast sorting by date

**Query performance:**
```sql
-- Fast (uses index)
SELECT * FROM activity_logs WHERE user_id = 1 ORDER BY created_at DESC;

-- Fast (uses index)
SELECT * FROM activity_logs WHERE action_type = 'movie_added';

-- Slow (no index)
SELECT * FROM activity_logs WHERE target_type = 'movie';
```

---

## Querying Activity Logs

### Via Prisma

```typescript
// Get recent activities
const activities = await prisma.activityLog.findMany({
  take: 50,
  orderBy: { created_at: 'desc' },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      }
    }
  }
});

// Filter by user
const userActivities = await prisma.activityLog.findMany({
  where: { user_id: userId },
  orderBy: { created_at: 'desc' },
});

// Filter by action type
const imports = await prisma.activityLog.findMany({
  where: { action_type: 'csv_import' },
  orderBy: { created_at: 'desc' },
});

// Filter by date range
const recentActivities = await prisma.activityLog.findMany({
  where: {
    created_at: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    }
  },
  orderBy: { created_at: 'desc' },
});
```

### Via SQL

```sql
-- Get all activities for a user
SELECT * FROM activity_logs
WHERE user_id = 1
ORDER BY created_at DESC;

-- Count activities by type
SELECT action_type, COUNT(*) as count
FROM activity_logs
GROUP BY action_type
ORDER BY count DESC;

-- Get activities with user info
SELECT al.*, u.name, u.email
FROM activity_logs al
JOIN users u ON al.user_id = u.id
WHERE al.created_at >= NOW() - INTERVAL '7 days'
ORDER BY al.created_at DESC;

-- Find movie additions
SELECT * FROM activity_logs
WHERE action_type = 'movie_added'
AND metadata->>'title' LIKE '%Oppenheimer%';
```

---

## Admin Dashboard Integration

### Viewing in Dashboard

Activities automatically appear in Admin Dashboard:
1. Navigate to `/admin`
2. Click "Activity" tab
3. View real-time feed

### Search and Filter

Use search bar to find specific activities:
- User name or email
- Action type
- Metadata content (e.g., movie title)

### Expanding Metadata

Click chevron icon to view full metadata JSON.

---

## Performance Considerations

### Pagination

For large activity feeds, use pagination:

```typescript
const limit = 50;
const offset = page * limit;

const [activities, total] = await Promise.all([
  prisma.activityLog.findMany({
    take: limit,
    skip: offset,
    orderBy: { created_at: 'desc' },
  }),
  prisma.activityLog.count()
]);
```

### Metadata Size

Keep metadata small for performance:
- ✅ Under 1KB per entry
- ⚠️ 1-10KB acceptable
- ❌ Over 10KB problematic

**Check metadata size:**
```sql
SELECT
  id,
  action_type,
  LENGTH(metadata::text) as metadata_size
FROM activity_logs
WHERE LENGTH(metadata::text) > 1000
ORDER BY metadata_size DESC;
```

### Database Cleanup

For production systems with high activity:

```sql
-- Archive old activities (older than 90 days)
CREATE TABLE activity_logs_archive AS
SELECT * FROM activity_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete archived activities
DELETE FROM activity_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## Common Patterns

### Pattern 1: Single Entity Action

```typescript
// Add, update, or delete single item
await logActivity({
  userId: user.id,
  actionType: 'movie_added',
  targetType: 'movie',
  targetId: movie.id,
  metadata: {
    title: movie.title,
    tmdb_id: movie.tmdb_id,
  },
});
```

### Pattern 2: Bulk Action

```typescript
// Import or batch operation
await logActivity({
  userId: user.id,
  actionType: 'csv_import',
  targetType: 'import',
  targetId: null,
  metadata: {
    count: movies.length,
    file_name: file.name,
  },
});
```

### Pattern 3: Relationship Action

```typescript
// Tag movie, add to vault, etc.
await logActivity({
  userId: user.id,
  actionType: 'vault_movie_added',
  targetType: 'vault',
  targetId: vault.id,
  metadata: {
    vault_name: vault.name,
    movie_title: movie.title,
    tmdb_id: movie.tmdb_id,
  },
});
```

### Pattern 4: System Event

```typescript
// Login, session, etc.
await logActivity({
  userId: user.id,
  actionType: 'user_login',
  ipAddress: getIP(request),
  userAgent: getUserAgent(request),
});
```

---

## Examples from Film Project

### Movie Addition

```typescript
// src/app/api/movies/route.ts
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const { tmdb_id, date_watched, personal_rating } = await request.json();

    // Get movie from TMDB
    const tmdbMovie = await getMovieDetails(tmdb_id);

    // Create or find movie
    const movie = await prisma.movie.upsert({
      where: { tmdb_id },
      create: { /* movie data */ },
      update: {}
    });

    // Create user movie
    await prisma.userMovie.create({
      data: {
        movie_id: movie.id,
        user_id: user.id,
        date_watched,
        personal_rating,
      }
    });

    // Log activity
    await logActivity({
      userId: user.id,
      actionType: 'movie_added',
      targetType: 'movie',
      targetId: movie.id,
      metadata: {
        title: movie.title,
        tmdb_id: movie.tmdb_id,
        release_year: new Date(movie.release_date).getFullYear(),
        personal_rating,
      },
    });

    return NextResponse.json({ success: true, data: movie });
  } catch (error) {
    // Handle error
  }
}
```

### Watchlist Addition

```typescript
// src/app/api/watchlist/route.ts
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const { tmdb_id, tag_ids } = await request.json();

    // Get movie from TMDB
    const tmdbMovie = await getMovieDetails(tmdb_id);

    // Create watchlist movie
    const watchlistMovie = await prisma.watchlistMovie.create({
      data: {
        user_id: user.id,
        tmdb_id,
        title: tmdbMovie.title,
        // ... other fields
      }
    });

    // Add tags
    if (tag_ids?.length) {
      await prisma.watchlistTag.createMany({
        data: tag_ids.map(tag_id => ({
          watchlist_movie_id: watchlistMovie.id,
          tag_id
        }))
      });
    }

    // Log activity
    await logActivity({
      userId: user.id,
      actionType: 'watchlist_added',
      targetType: 'watchlist',
      targetId: watchlistMovie.id,
      metadata: {
        title: tmdbMovie.title,
        tmdb_id,
        tag_count: tag_ids?.length || 0,
      },
    });

    return NextResponse.json({ success: true, data: watchlistMovie });
  } catch (error) {
    // Handle error
  }
}
```

---

## Related Documentation

- **Admin Operations:** [admin-operations.md](./admin-operations.md) - Using admin dashboard
- **Error Monitoring:** [error-monitoring.md](./error-monitoring.md) - Error logging guide
- **Architecture:** [../architecture.md](../architecture.md#admin-dashboard-january-2025) - Admin system overview
- **API Patterns:** [../api-auth-patterns.md](../api-auth-patterns.md) - Authentication patterns
