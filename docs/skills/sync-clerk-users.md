# Sync Clerk Users to Database

Manually sync Clerk users to the local PostgreSQL database until Clerk webhook is configured.

## Why This Is Needed

When a user signs up via Clerk:
1. ✅ User is created in Clerk's database
2. ❌ User is **NOT** automatically created in your PostgreSQL database
3. ❌ API routes fail with "User not found in database" error

**Solution:** Run this script to sync Clerk users to your database.

**Future:** Once the Clerk webhook is configured, this will happen automatically on signup.

## Usage

```bash
npx tsx scripts/create-clerk-user-manually.ts
```

## What It Does

1. Fetches all users from Clerk using the Clerk API
2. For each Clerk user:
   - Checks if user exists in PostgreSQL (by `clerk_id`)
   - If not exists, creates user record with:
     - `clerk_id` (from Clerk)
     - `email` (from Clerk)
     - `name` (from Clerk)
     - `role` = "user" (default)
3. Displays summary of synced users

## Example Output

```
🔄 Syncing Clerk users to database...

Found 2 users in Clerk

Processing user: ideaswithben@gmail.com (user_...)
✅ User already exists in database

Processing user: tyson.ben@gmail.com (user_...)
✨ Created new user in database

📊 Summary:
- Total Clerk users: 2
- Already in database: 1
- Newly created: 1

✅ Sync complete!
```

## When to Use

Run this script when:

- ✅ A new user signs up via Clerk
- ✅ API returns "User not found in database" error
- ✅ After resetting the database (development)
- ✅ When setting up a new environment

## Verification

After running the sync script, verify the user exists:

```bash
# Check database directly
npx prisma studio
# Navigate to "users" table and verify the user exists

# Or query via database
psql $DATABASE_URL -c "SELECT * FROM users;"
```

## Script Location

`/Users/bentyson/film/scripts/create-clerk-user-manually.ts`

## The Script

```typescript
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

async function syncClerkUsers() {
  console.log('🔄 Syncing Clerk users to database...\n');

  try {
    // Fetch all Clerk users
    const clerk = await clerkClient();
    const clerkUsers = await clerk.users.getUserList();

    console.log(`Found ${clerkUsers.data.length} users in Clerk\n`);

    let created = 0;
    let existing = 0;

    for (const clerkUser of clerkUsers.data) {
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();

      console.log(`Processing user: ${email} (${clerkUser.id})`);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { clerk_id: clerkUser.id }
      });

      if (existingUser) {
        console.log('✅ User already exists in database\n');
        existing++;
      } else {
        // Create user
        await prisma.user.create({
          data: {
            clerk_id: clerkUser.id,
            email: email || '',
            name: name || null,
            role: 'user'
          }
        });
        console.log('✨ Created new user in database\n');
        created++;
      }
    }

    console.log('📊 Summary:');
    console.log(`- Total Clerk users: ${clerkUsers.data.length}`);
    console.log(`- Already in database: ${existing}`);
    console.log(`- Newly created: ${created}\n`);
    console.log('✅ Sync complete!');

  } catch (error) {
    console.error('❌ Error syncing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncClerkUsers();
```

## Setting Up Clerk Webhook (Future)

To automate this process:

1. **In Clerk Dashboard:**
   - Go to "Webhooks"
   - Create new webhook endpoint
   - URL: `https://your-domain.com/api/webhooks/clerk`
   - Events: Select `user.created`

2. **Create webhook handler** (`src/app/api/webhooks/clerk/route.ts`):

```typescript
import { Webhook } from 'svix';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const payload = await req.json();
  const headers = req.headers;

  // Verify webhook signature
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  const evt = wh.verify(JSON.stringify(payload), {
    'svix-id': headers.get('svix-id')!,
    'svix-timestamp': headers.get('svix-timestamp')!,
    'svix-signature': headers.get('svix-signature')!,
  });

  // Handle user.created event
  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    await prisma.user.create({
      data: {
        clerk_id: id,
        email: email_addresses[0].email_address,
        name: `${first_name} ${last_name}`.trim(),
        role: 'user'
      }
    });
  }

  return Response.json({ success: true });
}
```

3. **Add webhook secret to environment:**
```bash
CLERK_WEBHOOK_SECRET=whsec_...
```

## Related Documentation

- [api-auth-patterns.md](../api-auth-patterns.md) - Authentication patterns
- [architecture.md § User Synchronization](../architecture.md#user-synchronization) - Architecture details
- [Clerk Webhooks Documentation](https://clerk.com/docs/integrations/webhooks/overview) - Official Clerk docs
