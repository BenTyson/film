# Clerk Authentication Setup - Step by Step

## Current Status
✅ Clerk installed and configured
✅ Database has User table
✅ Temp user (ID: 1) owns all 2,412 movies + 10 watchlist items
⚠️ **CRITICAL**: Need to transfer data to your real Clerk account after signup

---

## Setup Steps (Do in Order!)

### Step 1: Start Your Dev Server
```bash
npm run dev
# Should be running on http://localhost:3002
```

### Step 2: Set Up Webhook (Local Testing)

**Option A: Using ngrok (Recommended for testing)**

```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 3002

# You'll see output like:
# Forwarding: https://abc123.ngrok.io -> http://localhost:3002
```

**Option B: Skip webhook for now (Sign up will work, but user won't sync to DB)**

If you skip this, you'll manually create your user in the database.

### Step 3: Configure Webhook in Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Select your "Film Collection" app
3. Click **"Webhooks"** in left sidebar
4. Click **"Add Endpoint"**
5. Enter webhook URL:
   - If using ngrok: `https://YOUR_NGROK_URL.ngrok.io/api/webhooks/clerk`
   - Example: `https://abc123.ngrok.io/api/webhooks/clerk`
6. Subscribe to events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
7. Click **"Create"**
8. Copy the **Signing Secret** (starts with `whsec_...`)
9. Add to your `.env`:
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_your_secret_here
   ```
10. Restart your dev server

### Step 4: Sign Up with Your Email

1. Visit http://localhost:3002
2. Click **"Sign In"** → **"Sign up"**
3. Use your real email (the one you want to use for this app)
4. Complete signup
5. You'll be redirected to homepage

**⚠️ IMPORTANT**: At this point you'll see NO MOVIES because they're still linked to the temp user!

### Step 5: Transfer Data to Your Clerk Account

```bash
# Run the data transfer script
npx tsx scripts/transfer-data-to-clerk-user.ts
```

This script will:
- ✅ Find your new Clerk user
- ✅ Transfer all 2,412 movies to you
- ✅ Transfer all 10 watchlist items to you
- ✅ Promote you to admin role
- ✅ Delete the temporary user

### Step 6: Refresh and Verify

1. Refresh your browser (http://localhost:3002)
2. You should now see all 2,412 movies
3. Check that you're logged in (avatar in top nav)
4. Verify everything works!

---

## Troubleshooting

### Issue: "No movies showing after signup"
**Solution**: Run the data transfer script (Step 5)

### Issue: "Webhook failed" error
**Solution**: Make sure:
- ngrok is running
- CLERK_WEBHOOK_SECRET is in .env
- Dev server restarted after adding secret
- Webhook URL in Clerk dashboard is correct

### Issue: "Multiple users found" in transfer script
**Solution**: You have more than one Clerk account. Edit the script to specify your email:
```typescript
const realUsers = await prisma.user.findMany({
  where: {
    email: 'your-email@example.com' // Add this line
  }
});
```

### Issue: "Unauthorized" on API calls
**Solution**: The middleware is protecting all routes. We'll update API routes to allow authenticated access in the next phase.

---

## What's Next

After authentication is working:

### Phase 1: Update API Routes (High Priority)
Routes that need user filtering:
- `/api/movies` - Show only current user's movies
- `/api/watchlist` - Show only current user's watchlist
- `/api/movies/[id]` - Verify ownership

### Phase 2: Multi-User Support
- Each user gets their own collection
- Data is completely isolated
- Admin can see all users

### Phase 3: Production Deployment
- Deploy to Railway
- Update webhook URL to production domain
- Test in production

---

## Quick Reference

### Check Your User in Database
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

prisma.user.findMany().then(users => {
  console.log('All users:');
  users.forEach(u => console.log(\`  - \${u.name} (\${u.email}) - Role: \${u.role} - ID: \${u.id}\`));
}).finally(() => prisma.\$disconnect());
"
```

### Promote Yourself to Admin (if needed)
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

prisma.user.update({
  where: { email: 'your-email@example.com' },
  data: { role: 'admin' }
}).then(() => console.log('✅ Promoted to admin'))
  .finally(() => prisma.\$disconnect());
"
```

### Count Your Movies
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

prisma.user.findUnique({
  where: { email: 'your-email@example.com' },
  include: {
    _count: {
      select: { user_movies: true, watchlist_movies: true }
    }
  }
}).then(user => {
  console.log(\`Movies: \${user._count.user_movies}\`);
  console.log(\`Watchlist: \${user._count.watchlist_movies}\`);
}).finally(() => prisma.\$disconnect());
"
```
