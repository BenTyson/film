# Post-Deployment Verification Checklist

**Deployment Date**: 2025-11-23
**Commits Deployed**: c8eb672, 39f0ed2, 3e16d32, 3d657bf
**Deployment Method**: Git push to main → Railway auto-deploy

---

## Phase 1: Deployment Completion (5-10 minutes)

### Railway Dashboard Checks
- [ ] **Build Status**: Shows "Success" (not "Building" or "Failed")
- [ ] **Deploy Logs**: No error messages in final output
- [ ] **Health Check**: Railway shows service as "Active"
- [ ] **Expected Log Output**:
  ```
  ✓ Prisma Client generated
  ✓ Build completed successfully
  ✓ Server listening on port 3000
  ```

### Common Deployment Issues
If you see any of these, **DO NOT PROCEED** - investigate first:
- ❌ "Build failed" - Check build logs for TypeScript/dependency errors
- ❌ "Crashed" - Check for runtime errors in logs
- ❌ "DATABASE_URL not found" - Environment variables missing
- ❌ "Prisma generate failed" - Database connection issue

---

## Phase 2: Basic Functionality (10 minutes)

### Critical Path Testing
Test in this exact order:

#### 1. Site Loads
- [ ] Navigate to production URL
- [ ] Page loads without errors
- [ ] No infinite loading spinners
- [ ] No blank white screen

**Expected**: Homepage displays with movie grid or empty state

#### 2. Authentication Works
- [ ] Click "Sign In" button
- [ ] Clerk modal appears
- [ ] Can sign in with existing account
- [ ] Redirects back to homepage after sign-in
- [ ] User name/avatar appears in header

**Expected**: Seamless authentication, no errors

#### 3. Core Features Function
- [ ] Movies display in grid (if user has movies)
- [ ] Click on a movie card
- [ ] Movie detail page or modal opens
- [ ] Can navigate back to collection

**Expected**: Basic navigation works

#### 4. New Features Verify
- [ ] Open browser DevTools → Network tab
- [ ] Click to open a modal
- [ ] Check that modal chunk is loaded dynamically (lazy loading)
- [ ] Modal opens quickly

**Expected**: Improved performance from lazy loading

---

## Phase 3: Error Monitoring (First Hour)

### Browser Console Check
- [ ] Open DevTools → Console
- [ ] Navigate through 3-4 different pages
- [ ] **Red Flag**: Any errors in console
- [ ] **Green Flag**: Clean console or only warnings

### Railway Logs Monitoring
- [ ] Open Railway → Deployments → View Logs
- [ ] Filter to last 10 minutes
- [ ] **Red Flag**: Repeated errors or crashes
- [ ] **Green Flag**: Normal request logs only

### Security Headers Verification
```bash
# Run this in terminal to verify security headers
curl -I https://your-production-url.com
```

**Expected Headers**:
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: on
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## Phase 4: Smoke Testing (First 24 Hours)

### Test All Major Features
- [ ] Add a new movie (if applicable)
- [ ] Create a vault
- [ ] Add to watchlist
- [ ] Search functionality
- [ ] Filter/sort operations
- [ ] Admin dashboard (if admin user)

### Monitor for Patterns
- [ ] Check Railway logs every few hours
- [ ] Look for error spikes
- [ ] Monitor response times
- [ ] Watch for database connection issues

---

## Rollback Criteria

**Rollback immediately if**:
- Site is completely down (504/502 errors)
- Authentication is broken (users can't sign in)
- Database errors on every page load
- Critical features completely non-functional

**Rollback Procedure**:
```bash
git log --oneline -10  # Note the last good commit
git revert HEAD~5..HEAD --no-edit
git push origin main
# Railway will auto-deploy previous version in 3-5 minutes
```

---

## Success Criteria

### After 1 Hour
- ✅ No critical errors in Railway logs
- ✅ Site is accessible and responsive
- ✅ Authentication working
- ✅ Core features functional

### After 24 Hours
- ✅ No increase in error rates
- ✅ Performance stable or improved
- ✅ No user-reported issues
- ✅ All features working as expected

---

## What Changed in This Deployment

### User-Facing
- **Performance**: Modals load faster (lazy loading)
- **Error Handling**: Better error messages with retry buttons
- **Stability**: More robust error boundaries

### Behind the Scenes
- **Security**: 5 new security headers protecting users
- **Testing**: 372 tests ensuring code quality
- **Code Quality**: 0 lint errors, strict TypeScript
- **Infrastructure**: Environment validation

### NOT Changed
- Database schema (optimizations pending in maintenance window)
- UI design or layout
- Feature set (no new features, only improvements)

---

## Next Actions After Verification

### If All Green ✅
1. Update `docs/CURRENT-STATUS.md` to "Deployed Successfully"
2. Monitor for 24 hours
3. Schedule database optimization maintenance window
4. Plan next sprint work

### If Issues Found 🚨
1. Document the issue in Railway logs
2. Check if it's minor (can fix forward) or critical (need rollback)
3. For critical issues: Rollback immediately
4. For minor issues: Create GitHub issue, fix in next sprint

---

## Contact Information

- **Railway Dashboard**: https://railway.app/dashboard
- **GitHub Repository**: https://github.com/BenTyson/film
- **Documentation**: This repository's `/docs` folder
- **Migration Issues**: See `docs/MIGRATION-DRIFT.md`

---

**Remember**: This deployment added infrastructure improvements, not new features. If everything looks the same to users but works more reliably behind the scenes, that's SUCCESS.
