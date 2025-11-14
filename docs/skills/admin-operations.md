# Admin Operations Skill

Guide for managing users, monitoring activity, and tracking errors in the admin dashboard.

## Accessing Admin Dashboard

### Prerequisites

1. **User Role:** Must have `role = 'admin'` in database
2. **Authentication:** Must be signed in via Clerk

### Set Admin Role

```bash
# Using Prisma Studio
npx prisma studio
# Navigate to User model → Find your user → Set role to 'admin'

# Or via SQL
psql $DATABASE_URL
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Navigate to Dashboard

```
https://your-domain.com/admin
```

**Access Control:**
- ✅ Admins see tabbed interface (Users, Activity, Errors)
- ❌ Non-admins redirected to home page (server-side protection)

---

## User Management

### View All Users

**Location:** Admin Dashboard → Users Tab

**Features:**
- Search by name or email
- Sort by: name, email, role, last login, created date
- View statistics per user:
  - Movies in collection
  - Watchlist items
  - Vaults created
  - Tags used

### Edit User

1. Click "Edit" button next to user in table
2. Modal opens with:
   - **Name** field (editable)
   - **Role** dropdown (user/admin)
3. Click "Save" to update

**API Endpoint:**
```typescript
PATCH /api/admin/users/[id]
{
  "name": "Updated Name",
  "role": "admin" // or "user"
}
```

### User Statistics Cards

Dashboard shows system-wide metrics:

**Users:**
- Total users
- New this month
- Active this week (users who logged in within 7 days)

**Content:**
- Total movies across all users
- Total watchlist items
- Total vaults
- Total tags
- Average collection size

**Oscars:**
- Total Oscar movies
- Total Oscar nominations

---

## Activity Monitoring

### View Activity Feed

**Location:** Admin Dashboard → Activity Tab

**Features:**
- Real-time feed of all user actions
- Last 50 activities by default
- Color-coded action types
- Relative timestamps ("2 hours ago")

### Search Activities

Use search bar to filter by:
- User name
- User email
- Action type
- Metadata content (e.g., movie title)

**Example searches:**
- "Ben" - Find all Ben's actions
- "csv_import" - Find all CSV imports
- "Oppenheimer" - Find actions involving Oppenheimer movie

### Action Types

**Movie Actions (Green):**
- `movie_added` - User added movie to collection
- `movie_updated` - User updated movie details
- `movie_removed` - User removed movie from collection

**Import Actions (Purple):**
- `csv_import` - User imported movies from CSV

**Watchlist Actions (Pink/Red):**
- `watchlist_added` - User added movie to watchlist
- `watchlist_removed` - User removed from watchlist

**Vault Actions (Yellow/Blue/Red):**
- `vault_created` - User created new vault
- `vault_updated` - User updated vault details
- `vault_deleted` - User deleted vault
- `vault_movie_added` - User added movie to vault
- `vault_movie_removed` - User removed movie from vault

**Tag Actions (Orange):**
- `tag_created` - User created new tag
- `movie_tagged` - User tagged movie

**User Actions (Gray):**
- `user_login` - User signed in

### View Activity Metadata

1. Click expand icon (chevron) next to activity
2. View JSON metadata with context:
   ```json
   {
     "title": "Oppenheimer",
     "tmdb_id": 872585,
     "count": 15
   }
   ```

### API Endpoint

```typescript
GET /api/admin/activity?limit=50&offset=0
Query params:
  - user_id: Filter by specific user
  - action_type: Filter by action type
  - limit: Number of activities (default 50)
  - offset: Pagination offset (default 0)
```

---

## Error Monitoring

### View Error Dashboard

**Location:** Admin Dashboard → Errors Tab

**Features:**
- Error statistics cards
- Error log table
- Stack trace viewer

### Error Statistics

**Counts:**
- Last 24 hours
- Last 7 days
- Last 30 days
- Total errors

**Trends:**
- Increasing/Decreasing/Stable indicators
- Error rate change percentage

**Badge:** Errors tab shows count of errors in last 24h

### Search Error Logs

Use search bar to filter by:
- Endpoint (e.g., "/api/movies")
- HTTP method (GET, POST, PUT, DELETE)
- Error message
- Status code

**Example searches:**
- "500" - Find all internal server errors
- "/api/movies" - Find all movie API errors
- "unauthorized" - Find auth errors

### View Stack Trace

1. Click expand icon next to error row
2. View full stack trace with:
   - Error message
   - File path and line numbers
   - Function call stack

### Error Status Codes

**Color-coded badges:**
- 🟡 4xx - Client errors (yellow)
- 🔴 5xx - Server errors (red)

**Common codes:**
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

### API Endpoints

```typescript
// Get error logs
GET /api/admin/errors?limit=50&offset=0
Query params:
  - endpoint: Filter by endpoint
  - status_code: Filter by status code
  - limit: Number of errors (default 50)
  - offset: Pagination offset (default 0)

// Get error statistics
GET /api/admin/errors/stats
```

---

## Adding Activity Logging to New Features

### When to Log Activity

Log user actions that:
- Modify data (create, update, delete)
- Import/export data
- Change settings
- Perform significant operations

### Implementation

```typescript
import { logActivity } from '@/lib/activity-logger';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    // ... perform operation
    const movie = await prisma.movie.create({ /* ... */ });

    // Log activity after successful operation
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

    return NextResponse.json({ success: true, data: movie });
  } catch (error) {
    // Handle error
  }
}
```

### Activity Types

```typescript
type ActivityType =
  | 'movie_added'
  | 'movie_updated'
  | 'movie_removed'
  | 'csv_import'
  | 'watchlist_added'
  | 'watchlist_removed'
  | 'vault_created'
  | 'vault_updated'
  | 'vault_deleted'
  | 'vault_movie_added'
  | 'vault_movie_removed'
  | 'tag_created'
  | 'movie_tagged'
  | 'user_login';
```

### Metadata Best Practices

**✅ DO:**
- Include identifying information (title, name, id)
- Keep metadata small and relevant
- Use consistent key names across action types

**❌ DON'T:**
- Log sensitive data (passwords, tokens)
- Include large objects or arrays
- Store redundant information

**Examples:**

```typescript
// Good metadata
metadata: {
  title: "Oppenheimer",
  tmdb_id: 872585,
  count: 15, // for imports
  vault_name: "Best of 2023"
}

// Bad metadata
metadata: {
  entire_movie_object: movie, // Too large
  user_password: "...", // Sensitive
  duplicate_user_id: user.id // Redundant (already tracked)
}
```

---

## Adding Error Logging to API Routes

### When to Log Errors

Log errors that:
- Return 4xx or 5xx status codes
- Throw exceptions
- Fail validation
- Timeout or fail external API calls

### Implementation

```typescript
import { logError } from '@/lib/error-logger';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    // ... perform operation

  } catch (error) {
    // Log error before returning response
    await logError({
      userId: user?.id, // Optional - may be null if auth failed
      endpoint: '/api/movies',
      method: 'POST',
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stackTrace: error instanceof Error ? error.stack : null,
      requestBody: body,
    });

    return NextResponse.json(
      { success: false, error: 'Failed to add movie' },
      { status: 500 }
    );
  }
}
```

### Using withErrorLogging Wrapper

For automatic error logging:

```typescript
import { withErrorLogging } from '@/lib/error-logger';

async function handler(request: Request) {
  const user = await getCurrentUser();
  // ... your logic
  return NextResponse.json({ success: true });
}

export const POST = withErrorLogging(handler, '/api/movies');
```

**Benefits:**
- Automatic error capture
- Consistent error logging
- Less boilerplate code

### Error Metadata

**Captured automatically:**
- Endpoint path
- HTTP method
- Status code
- Error message
- Stack trace
- Timestamp

**Optional:**
- Request body (for debugging)
- Request params (query/path)
- User ID (if authenticated)

---

## Dashboard Refresh

### Auto-Refresh

Dashboard data fetched on:
- Initial page load
- Manual refresh button click
- Tab switch

### Manual Refresh

Click "Refresh" button in top-right:
- Fetches latest data from all APIs
- Updates all tabs
- Shows loading spinner during refresh

### Real-Time Updates

**Not currently implemented.** Dashboard requires manual refresh to see:
- New user signups
- Recent activity
- Latest errors

**Future enhancement:** WebSocket or polling for real-time updates

---

## Security Considerations

### Role-Based Access Control

**Server-Side Protection:**
```typescript
// src/app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  try {
    await requireAdmin(); // Throws if not admin
  } catch {
    redirect('/'); // Redirect non-admins
  }
  return <>{children}</>;
}
```

**API Protection:**
```typescript
// All admin API routes
export async function GET(request: Request) {
  try {
    await requireAdmin(); // Returns 403 if not admin
    // ... admin operations
  } catch (error) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
```

### Navigation Hiding

Admin links hidden in navigation for non-admins:
```typescript
// src/app/page.tsx
const { role } = await fetch('/api/user/me').then(r => r.json());

const navItems = [
  // ... public links
  role === 'admin' && { href: '/admin', label: 'Admin', icon: Shield }
].filter(Boolean);
```

### Data Privacy

**Activity Logs:**
- ✅ Show user names and emails (admins need to know who did what)
- ❌ Never log passwords, tokens, or sensitive metadata

**Error Logs:**
- ✅ Show stack traces for debugging
- ❌ Sanitize sensitive data from request bodies
- ⚠️ Be cautious with PII in error messages

---

## Performance Tips

### Large Activity Feeds

If activity feed grows large:
1. Use pagination (limit/offset params)
2. Filter by specific user or action type
3. Implement date range filters (future enhancement)

### Error Log Management

For production with many errors:
1. Archive old errors to separate table
2. Set up automated error alerts
3. Create error summary dashboard
4. Implement error rate limiting

### Database Indexing

Activity and error tables are indexed on:
- `user_id` - Fast user filtering
- `action_type` - Fast action filtering
- `endpoint` - Fast endpoint filtering
- `created_at` - Fast date sorting

**Verify indexes:**
```sql
-- Check ActivityLog indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'activity_logs';

-- Check ErrorLog indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'error_logs';
```

---

## Troubleshooting

### Can't Access Admin Dashboard

**Problem:** Redirected to home page when visiting `/admin`

**Solutions:**
1. Verify your user role:
   ```sql
   SELECT email, role FROM users WHERE email = 'your-email@example.com';
   ```
2. Update role to admin:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
3. Sign out and sign back in

### Activity Feed Empty

**Problem:** No activities showing despite user actions

**Possible causes:**
1. Activity logging not implemented in API routes
2. Database connection issues
3. `logActivity()` function failing silently

**Debug:**
```typescript
// Check activity logs in database
const activities = await prisma.activityLog.findMany({
  take: 10,
  orderBy: { created_at: 'desc' }
});
console.log('Recent activities:', activities);
```

### Error Logs Not Showing

**Problem:** Errors occurring but not logged

**Possible causes:**
1. Error logging not implemented in API routes
2. `logError()` failing (check console)
3. Database permissions

**Debug:**
```typescript
// Test error logging manually
await logError({
  userId: 1,
  endpoint: '/test',
  method: 'GET',
  statusCode: 500,
  errorMessage: 'Test error',
  stackTrace: null,
});
```

### Dashboard Loading Slow

**Problem:** Admin page takes long to load

**Optimizations:**
1. Reduce limit on activity/error queries
2. Add date range filters
3. Use pagination instead of loading all data
4. Optimize database queries with proper indexes

---

## Examples from Film Project

### Adding Activity Log to CSV Import

```typescript
// src/app/api/import/csv/route.ts
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    // Import movies
    const movies = await importCSV(data);

    // Log successful import
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

    return NextResponse.json({ success: true, count: movies.length });
  } catch (error) {
    // Error logging handled by withErrorLogging wrapper
  }
}
```

### Adding Error Log to Movie API

```typescript
// src/app/api/movies/route.ts
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    // Validate
    if (!body.tmdb_id) {
      await logError({
        userId: user.id,
        endpoint: '/api/movies',
        method: 'POST',
        statusCode: 400,
        errorMessage: 'Missing tmdb_id in request',
        requestBody: body,
      });

      return NextResponse.json(
        { success: false, error: 'tmdb_id required' },
        { status: 400 }
      );
    }

    // ... rest of logic

  } catch (error) {
    await logError({
      userId: user?.id,
      endpoint: '/api/movies',
      method: 'POST',
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stackTrace: error instanceof Error ? error.stack : null,
      requestBody: body,
    });

    return NextResponse.json(
      { success: false, error: 'Failed to add movie' },
      { status: 500 }
    );
  }
}
```

---

## Related Documentation

- **Activity Logging:** [activity-logging.md](./activity-logging.md) - Detailed activity logging guide
- **Error Monitoring:** [error-monitoring.md](./error-monitoring.md) - Comprehensive error tracking guide
- **Architecture:** [../architecture.md](../architecture.md#admin-dashboard-january-2025) - Admin system architecture
- **Quick Start:** [../session-start/QUICK-START.md](../session-start/QUICK-START.md) - Admin dashboard overview
