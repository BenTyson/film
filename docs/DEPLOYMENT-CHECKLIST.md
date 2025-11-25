# Deployment Checklist

## Pre-Deployment ✅

- [x] **372 tests passing** (24 files)
- [x] **0 lint errors** (3 warnings acceptable - test mocks)
- [x] **Build succeeds** (production mode)
- [x] **Security headers configured**
- [x] **Environment validation implemented**
- [x] **Documentation updated**
- [x] **Commits clean and descriptive**

## Deployment (Option A - Code Only)

### Step 1: Push to Repository
```bash
git push origin main
```

### Step 2: Monitor Railway Deployment
Railway will automatically:
1. Detect new commits on `main` branch
2. Run `prisma generate`
3. Run `next build`
4. Deploy to production
5. Update with zero downtime

**Expected Duration**: 3-5 minutes

### Step 3: Verify Deployment
Check these URLs after deployment:
- [ ] Homepage loads: `https://your-domain.com`
- [ ] Authentication works (Clerk sign-in)
- [ ] Movie collection displays
- [ ] Modals load (should feel faster due to lazy loading)
- [ ] No console errors in browser DevTools

## Post-Deployment Monitoring (First 24 Hours)

### Health Checks
- [ ] **Railway Logs**: Check for startup errors
- [ ] **Error Rate**: Monitor ErrorBoundary catches
- [ ] **Response Times**: Should improve on modal-heavy pages
- [ ] **Clerk Webhooks**: Verify user creation working

### Key Metrics to Watch
1. **Error Logs** (Railway dashboard):
   - Look for new error patterns
   - Check ErrorBoundary is catching gracefully

2. **Performance** (Browser DevTools):
   - Initial load time
   - Modal open speed (should be faster)
   - Bundle size (check Network tab)

3. **Database** (Railway Prisma Studio):
   - Query performance (no degradation expected)
   - No connection issues

### Rollback Plan (If Needed)
```bash
# Revert to previous commit
git revert HEAD --no-edit
git push origin main

# Railway will auto-deploy previous version
```

## Database Optimization (Schedule Separately)

### Prerequisites
1. [ ] Schedule maintenance window (off-peak hours)
2. [ ] Notify team of brief database operation
3. [ ] Have rollback SQL ready

### Execution
```sql
-- 1. Check for duplicates
SELECT user_id, movie_id, COUNT(*)
FROM user_movies
GROUP BY user_id, movie_id
HAVING COUNT(*) > 1;

-- 2. If none found, apply: scripts/migrations/add-user-movies-indexes.sql
-- 3. Verify indexes created
SELECT indexname FROM pg_indexes WHERE tablename = 'user_movies';
```

**Duration**: 5-10 minutes
**Risk**: Low (indexes are non-breaking)

## Success Criteria

### Immediate (Day 1)
- ✅ Deployment completes without errors
- ✅ All core features functioning
- ✅ No spike in error rates
- ✅ Users can authenticate and view movies

### Week 1
- ✅ Error handling improved (ErrorBoundary catches edge cases)
- ✅ Performance stable or improved
- ✅ No database issues
- ✅ Database indexes applied successfully

## Contacts & Resources

- **Railway Dashboard**: https://railway.app/dashboard
- **Error Logs**: Railway → Project → Deployments → Logs
- **Database**: Railway → Project → Database → Connect
- **Clerk Dashboard**: https://dashboard.clerk.com
- **Documentation**: `/docs` directory in repository

## Post-Deployment Notes

**Date**: _________________
**Deployed By**: _________________
**Deploy Duration**: _________________
**Issues Encountered**: _________________
**Database Migration Applied**: [ ] Yes [ ] No
**Next Actions**: _________________
