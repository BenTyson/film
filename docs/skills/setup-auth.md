# Setup Authentication Skill

**For the upcoming authentication/login update**

Guide for implementing NextAuth.js authentication in the Film app.

## Overview

This skill covers the complete implementation of user authentication and authorization using NextAuth.js with credentials-based login.

**Goals:**
- User registration and login
- Session management
- Protected routes (API and pages)
- Role-based permissions (user, admin)
- Multi-user support

---

## 1. Install Dependencies

```bash
npm install next-auth
npm install bcrypt
npm install --save-dev @types/bcrypt
```

---

## 2. Database Schema Updates

### Add User and Session Models

Edit `prisma/schema.prisma`:

```prisma
model User {
  id            Int       @id @default(autoincrement())
  email         String    @unique
  name          String?
  password_hash String
  role          String    @default("user") // "user" or "admin"
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  // Relations
  sessions      Session[]
  user_movies   UserMovie[]

  @@map("users")
}

model Session {
  id         Int      @id @default(autoincrement())
  user_id    Int
  token      String   @unique
  expires_at DateTime
  created_at DateTime @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([token])
  @@map("sessions")
}

// Update existing UserMovie model
model UserMovie {
  id                 Int       @id @default(autoincrement())
  movie_id           Int
  user_id            Int       // Change: link to User instead of hardcoded
  date_watched       DateTime?
  personal_rating    Int?
  notes              String?
  is_favorite        Boolean   @default(false)
  buddy_watched_with String?
  watch_location     String?
  created_at         DateTime  @default(now())
  updated_at         DateTime  @updatedAt

  movie Movie @relation(fields: [movie_id], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("user_movies")
}
```

### Run Migration

```bash
npx prisma migrate dev --name add_user_authentication
npx prisma generate
```

**→ See [database-migration.md](./database-migration.md) for migration details**

---

## 3. Environment Variables

Add to `.env`:

```bash
# NextAuth
NEXTAUTH_SECRET=your_secret_key_here_generate_with_openssl
NEXTAUTH_URL=http://localhost:3000

# For production
# NEXTAUTH_URL=https://yourdomain.com
```

**Generate secret:**
```bash
openssl rand -base64 32
```

---

## 4. NextAuth Configuration

### Create Auth Route Handler

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcrypt';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        // Find user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          throw new Error('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await compare(
          credentials.password,
          user.password_hash
        );

        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        // Return user object (without password)
        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/login'
  },
  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

---

### Update TypeScript Types

Create `src/types/next-auth.d.ts`:

```typescript
import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
  }

  interface Session {
    user: User;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}
```

---

## 5. User Registration API

Create `src/app/api/auth/register/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { hash } from 'bcrypt';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validation
    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return Response.json(
        { success: false, error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const password_hash = await hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password_hash,
        role: 'user'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true
      }
    });

    return Response.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}
```

---

## 6. Login Page

Create `src/app/login/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-card rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-background border border-border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-background border border-border rounded"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <a href="/register" className="text-primary hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
```

---

## 7. Protected API Routes

### Pattern 1: Require Authentication

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // User is authenticated
  const userId = parseInt(session.user.id);

  const movies = await prisma.movie.findMany({
    where: {
      user_movies: {
        some: { user_id: userId }
      }
    }
  });

  return Response.json({ success: true, data: movies });
}
```

### Pattern 2: Require Admin Role

```typescript
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Admin-only logic
  await prisma.movie.delete({ where: { id: movieId } });

  return Response.json({ success: true });
}
```

---

## 8. Protected Pages

### Server Component Protection

```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome, {session.user.name || session.user.email}!</h1>
      {/* Protected content */}
    </div>
  );
}
```

### Client Component Protection

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

export default function ProtectedClientPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    redirect('/login');
  }

  return <div>Protected content for {session.user.email}</div>;
}
```

---

## 9. SessionProvider Wrapper

Update `src/app/layout.tsx`:

```typescript
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

---

## 10. Navigation with Auth

Update `src/components/layout/Navigation.tsx`:

```typescript
'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export function Navigation() {
  const { data: session, status } = useSession();

  return (
    <nav className="flex items-center justify-between p-4">
      <div className="flex gap-4">
        <Link href="/">Home</Link>
        <Link href="/oscars">Oscars</Link>
        <Link href="/watchlist">Watchlist</Link>
      </div>

      <div className="flex gap-4 items-center">
        {status === 'loading' ? (
          <div>Loading...</div>
        ) : session ? (
          <>
            <span>Welcome, {session.user.name || session.user.email}</span>
            {session.user.role === 'admin' && (
              <Link href="/admin">Admin</Link>
            )}
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
```

---

## 11. Migration Considerations

### Migrating Existing Data

**Challenge:** Current UserMovie records use hardcoded `user_id = 1`

**Solution:** Create default admin user, reassign data

```typescript
// scripts/migrate-to-auth.ts
import { prisma } from '../src/lib/prisma';
import { hash } from 'bcrypt';

async function migrateToAuth() {
  // 1. Create default admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@film.app',
      name: 'Admin',
      password_hash: await hash('change-this-password', 12),
      role: 'admin'
    }
  });

  console.log(`Created admin user with ID: ${adminUser.id}`);

  // 2. Update all existing user_movies
  const updateResult = await prisma.userMovie.updateMany({
    where: { user_id: 1 },
    data: { user_id: adminUser.id }
  });

  console.log(`Updated ${updateResult.count} user_movies`);

  console.log('Migration complete! Default admin credentials:');
  console.log('Email: admin@film.app');
  console.log('Password: change-this-password');
  console.log('⚠️  CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN');
}

migrateToAuth()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run migration:
```bash
npx tsx scripts/migrate-to-auth.ts
```

---

## 12. Testing

### Test User Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 13. Deployment Checklist

- [ ] Update DATABASE_URL for production
- [ ] Set strong NEXTAUTH_SECRET in Railway
- [ ] Set NEXTAUTH_URL to production domain
- [ ] Run database migrations
- [ ] Create admin user
- [ ] Test login/logout flows
- [ ] Verify protected routes
- [ ] Test role-based permissions
- [ ] Update documentation

---

## Best Practices

### ✅ DO:
- Use bcrypt for password hashing (12+ rounds)
- Validate all user inputs
- Use environment variables for secrets
- Implement proper session management
- Add rate limiting to auth endpoints
- Use HTTPS in production
- Set secure cookie options

### ❌ DON'T:
- Don't store passwords in plain text
- Don't use weak secrets
- Don't skip input validation
- Don't expose user password hashes
- Don't allow weak passwords
- Don't forget to test protected routes

---

## Related Documentation

- **Add Feature:** [add-feature.md](./add-feature.md) - Feature development workflow
- **Database Migration:** [database-migration.md](./database-migration.md) - Schema changes
- **Main Overview:** [../CLAUDE.md](../CLAUDE.md) - Project overview
- **Quick Start:** [../session-start/QUICK-START.md](../session-start/QUICK-START.md)

---

## Next Steps After Auth Implementation

1. Add password reset functionality
2. Implement email verification
3. Add OAuth providers (Google, GitHub)
4. Create admin dashboard
5. Add user profile pages
6. Implement user-specific movie collections
7. Add sharing/social features
