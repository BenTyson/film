# Error Monitoring Skill

Guide for implementing comprehensive error tracking and monitoring across the application.

## Overview

Error monitoring captures and logs errors for:
- **Debugging:** Identify root causes of failures
- **Monitoring:** Track error trends and patterns
- **Alerting:** Get notified of critical issues
- **Analytics:** Understand error distribution by endpoint

---

## Error Logger API

### Import

```typescript
import { logError } from '@/lib/error-logger';
```

### Function Signature

```typescript
export async function logError({
  userId,
  endpoint,
  method,
  statusCode,
  errorMessage,
  stackTrace,
  requestBody,
  requestParams,
}: ErrorLogParams): Promise<void>
```

### Parameters

```typescript
interface ErrorLogParams {
  userId?: number | null;      // User who encountered error (nullable)
  endpoint: string;            // API endpoint or page path
  method: string;              // HTTP method (GET, POST, PUT, DELETE)
  statusCode: number;          // HTTP status code (400, 500, etc.)
  errorMessage: string;        // Error message
  stackTrace?: string | null;  // Stack trace if available
  requestBody?: Record<string, unknown>; // Request body for debugging
  requestParams?: Record<string, unknown>; // Request params (query/path)
}
```

---

## Basic Implementation

### Simple Error Log

```typescript
import { logError } from '@/lib/error-logger';

export async function POST(request: Request) {
  try {
    // Your logic
  } catch (error) {
    await logError({
      endpoint: '/api/movies',
      method: 'POST',
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### With User Context

```typescript
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    // Your logic
  } catch (error) {
    await logError({
      userId: user?.id, // May be null if auth failed
      endpoint: '/api/movies',
      method: 'POST',
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stackTrace: error instanceof Error ? error.stack : null,
    });

    return NextResponse.json(
      { success: false, error: 'Failed to add movie' },
      { status: 500 }
    );
  }
}
```

### With Request Details

```typescript
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    // Your logic

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

## Advanced Implementation

### Validation Errors (400)

```typescript
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    // Validate input
    if (!body.tmdb_id) {
      await logError({
        userId: user.id,
        endpoint: '/api/movies',
        method: 'POST',
        statusCode: 400,
        errorMessage: 'Missing required field: tmdb_id',
        requestBody: body,
      });

      return NextResponse.json(
        { success: false, error: 'tmdb_id is required' },
        { status: 400 }
      );
    }

    // Continue with logic
  } catch (error) {
    // Handle 500 errors
  }
}
```

### Authentication Errors (401/403)

```typescript
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
  } catch (authError) {
    await logError({
      userId: null, // No user context
      endpoint: '/api/movies',
      method: 'GET',
      statusCode: 401,
      errorMessage: 'Unauthorized: Authentication required',
      stackTrace: authError instanceof Error ? authError.stack : null,
    });

    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check permissions
  if (user.role !== 'admin') {
    await logError({
      userId: user.id,
      endpoint: '/api/admin/users',
      method: 'GET',
      statusCode: 403,
      errorMessage: `Forbidden: User ${user.email} attempted admin access`,
    });

    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }
}
```

### External API Errors

```typescript
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const tmdb_id = searchParams.get('tmdb_id');

    // Call TMDB API
    const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdb_id}`);

    if (!response.ok) {
      await logError({
        userId: user.id,
        endpoint: '/api/tmdb/movie',
        method: 'GET',
        statusCode: response.status,
        errorMessage: `TMDB API error: ${response.statusText}`,
        requestParams: { tmdb_id },
      });

      return NextResponse.json(
        { success: false, error: 'Failed to fetch movie from TMDB' },
        { status: 502 } // Bad Gateway
      );
    }

    const movie = await response.json();
    return NextResponse.json({ success: true, data: movie });

  } catch (error) {
    await logError({
      userId: user?.id,
      endpoint: '/api/tmdb/movie',
      method: 'GET',
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : 'TMDB API timeout',
      stackTrace: error instanceof Error ? error.stack : null,
    });

    return NextResponse.json(
      { success: false, error: 'External API error' },
      { status: 500 }
    );
  }
}
```

---

## Higher-Order Function Wrapper

### Using withErrorLogging

Automatically log errors with minimal boilerplate:

```typescript
import { withErrorLogging } from '@/lib/error-logger';

async function handler(request: Request) {
  const user = await getCurrentUser();

  const movie = await prisma.movie.create({
    data: { /* ... */ }
  });

  return NextResponse.json({ success: true, data: movie });
}

// Wrap handler with error logging
export const POST = withErrorLogging(handler, '/api/movies');
```

### How It Works

```typescript
// src/lib/error-logger.ts
export function withErrorLogging<T>(
  handler: (request: Request, ...args: unknown[]) => Promise<T>,
  endpoint: string
): (request: Request, ...args: unknown[]) => Promise<T> {
  return async (request: Request, ...args: unknown[]) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      // Extract user if possible
      const user = await getCurrentUser().catch(() => null);

      // Extract request details
      const details = await getRequestDetails(request);

      // Log error
      await logError({
        userId: user?.id,
        endpoint,
        method: request.method,
        statusCode: 500,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stackTrace: error instanceof Error ? error.stack : null,
        requestBody: details.body,
        requestParams: details.params,
      });

      // Re-throw error to be handled by Next.js
      throw error;
    }
  };
}
```

**Benefits:**
- Automatic error capture
- Consistent logging format
- Less boilerplate code
- Preserves original error for Next.js error handling

---

## Error Prevention

### Preventing Error Loops

`logError()` **never throws errors** to prevent infinite loops:

```typescript
export async function logError(params: ErrorLogParams): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        user_id: params.userId,
        endpoint: params.endpoint,
        method: params.method,
        status_code: params.statusCode,
        error_message: params.errorMessage,
        stack_trace: params.stackTrace,
        request_body: params.requestBody ?
          JSON.parse(JSON.stringify(params.requestBody)) : null,
        request_params: params.requestParams ?
          JSON.parse(JSON.stringify(params.requestParams)) : null,
      },
    });
  } catch (error) {
    // Log to console but never throw
    console.error('Failed to log error to database:', error);
  }
}
```

**Why:** If error logging fails (e.g., database down), we don't want to create cascading errors.

### Sanitizing Sensitive Data

Remove sensitive information before logging:

```typescript
function sanitizeRequestBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) {
    return body;
  }

  const sanitized = { ...body as Record<string, unknown> };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'api_key', 'secret'];
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Usage
await logError({
  userId: user.id,
  endpoint: '/api/auth/login',
  method: 'POST',
  statusCode: 401,
  errorMessage: 'Invalid credentials',
  requestBody: sanitizeRequestBody(body),
});
```

---

## Database Schema

### ErrorLog Model

```prisma
model ErrorLog {
  id             Int      @id @default(autoincrement())
  user_id        Int?     // Nullable for system/auth errors
  endpoint       String
  method         String
  status_code    Int
  error_message  String
  stack_trace    String?  @db.Text
  request_body   Json?
  request_params Json?
  created_at     DateTime @default(now())

  user User? @relation(fields: [user_id], references: [id], onDelete: SetNull)

  @@index([user_id])
  @@index([endpoint])
  @@index([created_at])
  @@map("error_logs")
}
```

### Indexes

**Why indexed:**
- `user_id` - Fast filtering by user
- `endpoint` - Fast filtering by endpoint
- `created_at` - Fast sorting by date

**Query performance:**
```sql
-- Fast (uses index)
SELECT * FROM error_logs WHERE endpoint = '/api/movies' ORDER BY created_at DESC;

-- Fast (uses index)
SELECT * FROM error_logs WHERE user_id = 1;

-- Slow (no index)
SELECT * FROM error_logs WHERE status_code = 500;
```

---

## Querying Error Logs

### Via Prisma

```typescript
// Get recent errors
const errors = await prisma.errorLog.findMany({
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

// Filter by endpoint
const movieErrors = await prisma.errorLog.findMany({
  where: { endpoint: { contains: '/api/movies' } },
  orderBy: { created_at: 'desc' },
});

// Filter by status code
const serverErrors = await prisma.errorLog.findMany({
  where: { status_code: { gte: 500 } },
  orderBy: { created_at: 'desc' },
});

// Get error statistics
const errorStats = await prisma.errorLog.groupBy({
  by: ['status_code'],
  _count: { status_code: true },
  orderBy: { _count: { status_code: 'desc' } },
});
```

### Via SQL

```sql
-- Get all errors for an endpoint
SELECT * FROM error_logs
WHERE endpoint = '/api/movies'
ORDER BY created_at DESC;

-- Count errors by status code
SELECT status_code, COUNT(*) as count
FROM error_logs
GROUP BY status_code
ORDER BY count DESC;

-- Find most error-prone endpoints
SELECT endpoint, COUNT(*) as error_count
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY endpoint
ORDER BY error_count DESC
LIMIT 10;

-- Get errors with user info
SELECT el.*, u.name, u.email
FROM error_logs el
LEFT JOIN users u ON el.user_id = u.id
WHERE el.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY el.created_at DESC;
```

---

## Error Statistics

### Calculating Trends

```typescript
// src/app/api/admin/errors/stats/route.ts
export async function GET() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const [current24h, previous24h] = await Promise.all([
    prisma.errorLog.count({
      where: { created_at: { gte: last24h } }
    }),
    prisma.errorLog.count({
      where: {
        created_at: { gte: last48h, lt: last24h }
      }
    })
  ]);

  // Calculate trend
  const errorRateTrend = previous24h === 0 ? 0 :
    ((current24h - previous24h) / previous24h) * 100;

  const direction =
    errorRateTrend > 10 ? 'increasing' :
    errorRateTrend < -10 ? 'decreasing' :
    'stable';

  return NextResponse.json({
    success: true,
    data: {
      counts: {
        last_24h: current24h,
        last_7d: await prisma.errorLog.count({
          where: { created_at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } }
        }),
        total: await prisma.errorLog.count(),
      },
      trend: {
        error_rate_change_24h: Math.round(errorRateTrend),
        direction,
      },
    },
  });
}
```

### Top Error Endpoints

```typescript
const topEndpoints = await prisma.errorLog.groupBy({
  by: ['endpoint'],
  _count: { endpoint: true },
  where: {
    created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  },
  orderBy: { _count: { endpoint: 'desc' } },
  take: 5,
});
```

---

## Admin Dashboard Integration

### Viewing Errors

Errors automatically appear in Admin Dashboard:
1. Navigate to `/admin`
2. Click "Errors" tab
3. View error logs table

### Error Statistics Cards

Dashboard shows:
- Error count last 24h
- Error count last 7 days
- Error count last 30 days
- Total errors
- Trend indicators

### Search and Filter

Use search bar to find specific errors:
- Endpoint path
- Error message
- Status code

### Expanding Stack Traces

Click expand icon to view full stack trace.

---

## HTTP Status Codes

### Client Errors (4xx)

**400 Bad Request:**
```typescript
if (!body.tmdb_id) {
  await logError({
    userId: user.id,
    endpoint: '/api/movies',
    method: 'POST',
    statusCode: 400,
    errorMessage: 'Missing required field: tmdb_id',
  });
  return NextResponse.json({ error: 'tmdb_id required' }, { status: 400 });
}
```

**401 Unauthorized:**
```typescript
try {
  const user = await getCurrentUser();
} catch (error) {
  await logError({
    endpoint: '/api/movies',
    method: 'GET',
    statusCode: 401,
    errorMessage: 'Unauthorized: No valid session',
  });
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**403 Forbidden:**
```typescript
if (user.role !== 'admin') {
  await logError({
    userId: user.id,
    endpoint: '/api/admin/users',
    method: 'GET',
    statusCode: 403,
    errorMessage: 'Forbidden: User not admin',
  });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**404 Not Found:**
```typescript
const movie = await prisma.movie.findUnique({ where: { id } });
if (!movie) {
  await logError({
    userId: user.id,
    endpoint: `/api/movies/${id}`,
    method: 'GET',
    statusCode: 404,
    errorMessage: `Movie not found: ${id}`,
  });
  return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
}
```

### Server Errors (5xx)

**500 Internal Server Error:**
```typescript
try {
  // Database operation
} catch (error) {
  await logError({
    userId: user.id,
    endpoint: '/api/movies',
    method: 'POST',
    statusCode: 500,
    errorMessage: error.message,
    stackTrace: error.stack,
  });
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

**502 Bad Gateway:**
```typescript
const tmdbResponse = await fetch(tmdbUrl);
if (!tmdbResponse.ok) {
  await logError({
    userId: user.id,
    endpoint: '/api/tmdb/movie',
    method: 'GET',
    statusCode: 502,
    errorMessage: 'TMDB API returned error',
  });
  return NextResponse.json({ error: 'External API error' }, { status: 502 });
}
```

**503 Service Unavailable:**
```typescript
if (!isDatabaseConnected()) {
  await logError({
    endpoint: '/api/movies',
    method: 'GET',
    statusCode: 503,
    errorMessage: 'Database connection unavailable',
  });
  return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
}
```

---

## Performance Considerations

### Request Body Size

Avoid logging large request bodies:

```typescript
function truncateRequestBody(body: unknown, maxSize = 5000): unknown {
  const bodyString = JSON.stringify(body);
  if (bodyString.length <= maxSize) {
    return body;
  }

  return {
    _truncated: true,
    _size: bodyString.length,
    _preview: bodyString.substring(0, maxSize),
  };
}

await logError({
  // ...
  requestBody: truncateRequestBody(body),
});
```

### Database Cleanup

For production systems with many errors:

```sql
-- Archive old errors (older than 30 days)
CREATE TABLE error_logs_archive AS
SELECT * FROM error_logs
WHERE created_at < NOW() - INTERVAL '30 days';

-- Delete archived errors
DELETE FROM error_logs
WHERE created_at < NOW() - INTERVAL '30 days';

-- Or use automated cleanup script
```

### Pagination

```typescript
const limit = 50;
const offset = page * limit;

const [errors, total] = await Promise.all([
  prisma.errorLog.findMany({
    take: limit,
    skip: offset,
    orderBy: { created_at: 'desc' },
  }),
  prisma.errorLog.count()
]);
```

---

## Best Practices

### ✅ DO:

- Log all 4xx and 5xx errors
- Include stack traces for 5xx errors
- Capture user context when available
- Sanitize sensitive data
- Use descriptive error messages
- Include relevant request details
- Log external API failures
- Use consistent status codes

### ❌ DON'T:

- Log passwords or tokens
- Include entire large objects
- Throw errors from logError()
- Log successful operations (use activity logging)
- Ignore 4xx errors (they're still valuable)
- Log duplicate information
- Store binary data or files

---

## Common Patterns

### Pattern 1: Input Validation

```typescript
if (!isValid(body)) {
  await logError({
    userId: user.id,
    endpoint: '/api/movies',
    method: 'POST',
    statusCode: 400,
    errorMessage: 'Validation failed',
    requestBody: body,
  });
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
}
```

### Pattern 2: Database Error

```typescript
try {
  await prisma.movie.create({ data });
} catch (error) {
  await logError({
    userId: user.id,
    endpoint: '/api/movies',
    method: 'POST',
    statusCode: 500,
    errorMessage: `Database error: ${error.message}`,
    stackTrace: error.stack,
  });
  return NextResponse.json({ error: 'Failed to create movie' }, { status: 500 });
}
```

### Pattern 3: External API Error

```typescript
const response = await fetch(externalApi);
if (!response.ok) {
  await logError({
    userId: user.id,
    endpoint: '/api/proxy',
    method: 'GET',
    statusCode: 502,
    errorMessage: `External API error: ${response.statusText}`,
  });
  return NextResponse.json({ error: 'External service error' }, { status: 502 });
}
```

### Pattern 4: Permission Error

```typescript
if (!hasPermission(user, resource)) {
  await logError({
    userId: user.id,
    endpoint: '/api/resource',
    method: 'DELETE',
    statusCode: 403,
    errorMessage: 'User lacks permission to delete resource',
  });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

## Examples from Film Project

### Movie API Error Handling

```typescript
// src/app/api/movies/route.ts
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    // Validation
    if (!body.tmdb_id) {
      await logError({
        userId: user.id,
        endpoint: '/api/movies',
        method: 'POST',
        statusCode: 400,
        errorMessage: 'Missing required field: tmdb_id',
        requestBody: body,
      });

      return NextResponse.json(
        { success: false, error: 'tmdb_id is required' },
        { status: 400 }
      );
    }

    // Get movie from TMDB
    const tmdbMovie = await getMovieDetails(body.tmdb_id);

    // Create movie
    const movie = await prisma.movie.create({
      data: { /* ... */ }
    });

    return NextResponse.json({ success: true, data: movie });

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

### Admin API Error Handling

```typescript
// src/app/api/admin/users/route.ts
export async function GET(request: Request) {
  try {
    // Check admin permission
    const user = await requireAdmin();

    // Get users
    const users = await prisma.user.findMany({
      include: { /* stats */ }
    });

    return NextResponse.json({ success: true, data: users });

  } catch (error) {
    // Check if auth error
    if (error instanceof Error && error.message.includes('Forbidden')) {
      await logError({
        endpoint: '/api/admin/users',
        method: 'GET',
        statusCode: 403,
        errorMessage: 'Forbidden: Admin access required',
      });

      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // General error
    await logError({
      endpoint: '/api/admin/users',
      method: 'GET',
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stackTrace: error instanceof Error ? error.stack : null,
    });

    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
```

---

## Related Documentation

- **Activity Logging:** [activity-logging.md](./activity-logging.md) - Activity tracking guide
- **Admin Operations:** [admin-operations.md](./admin-operations.md) - Using admin dashboard
- **Architecture:** [../architecture.md](../architecture.md#admin-dashboard-january-2025) - Admin system overview
- **API Patterns:** [../api-auth-patterns.md](../api-auth-patterns.md) - Authentication patterns
