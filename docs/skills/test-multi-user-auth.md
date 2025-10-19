# Test Multi-User Authentication

Quick skill to verify authentication and data isolation is working correctly.

## Usage

```bash
npx tsx scripts/test-multi-user-isolation.ts
```

## What It Tests

This comprehensive test verifies:

1. **User Existence** - Both test users exist in database
2. **Movie Collection Isolation** - Each user only sees their own movies
3. **Watchlist Isolation** - Watchlist items are user-specific
4. **UserMovie Records Isolation** - Personal tracking data is isolated
5. **Tag Access Control** - Users cannot modify other users' movie tags
6. **Oscar Data Public Access** - Oscar data remains accessible to all users

## Expected Output

```
🔒 Testing Multi-User Data Isolation

✅ Both users found in database

📋 Test 1: Movie Collection Isolation
──────────────────────────────────────────────────
User 1 (ideaswithben@gmail.com): 2412 movies
User 2 (tyson.ben@gmail.com): 0 movies
✅ Movie collection isolation working correctly

📝 Test 2: Watchlist Isolation
──────────────────────────────────────────────────
User 1 watchlist: 10 items
User 2 watchlist: 0 items
✅ Watchlist isolation working correctly

🎬 Test 3: UserMovie Records Isolation
──────────────────────────────────────────────────
User 1 UserMovie records: 2412
User 2 UserMovie records: 0
✅ UserMovie records properly isolated

🏷️  Test 4: Tag Access Control
──────────────────────────────────────────────────
Sample movie: "The Long Walk" (ID: 1)
Owned by: User 1
✅ User 2 cannot access User 1's movie (as expected)

🏆 Test 5: Oscar Data Accessibility (should be public)
──────────────────────────────────────────────────
Oscar data records: 10 (accessible to all users)
Best Picture nominees: 10 (accessible to all users)
✅ Oscar data remains public (not filtered by user)

══════════════════════════════════════════════════
📊 SUMMARY
══════════════════════════════════════════════════
✅ User 1 (ideaswithben@gmail.com):
   - 2412 movies in collection
   - 10 watchlist items
   - 2412 UserMovie records

✅ User 2 (tyson.ben@gmail.com):
   - 0 movies in collection
   - 0 watchlist items
   - 0 UserMovie records

🏆 Oscar data: Public (10 records)

✅ ALL TESTS PASSED - Multi-user isolation is working correctly!
```

## When to Use

- After implementing new user-specific API routes
- After database schema changes affecting user relationships
- Before deploying authentication changes to production
- When troubleshooting multi-user data access issues

## Test Users

- **User 1:** ideaswithben@gmail.com (admin, has data)
- **User 2:** tyson.ben@gmail.com (user, empty collection)

## Related Documentation

- [api-auth-patterns.md](../api-auth-patterns.md) - Authentication implementation patterns
- [architecture.md § Multi-User Architecture](../architecture.md#multi-user-architecture-january-2025) - Multi-user system design
