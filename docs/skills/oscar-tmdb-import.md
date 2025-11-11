# Oscar TMDB Import & Verification Skill

**Purpose:** Import Oscar nominations from JSON with automated TMDB verification and manual review workflow

**Created:** January 2025
**Status:** Production-ready (99.7% auto-verification success, incremental import tested and verified)

---

## Overview

This skill enables importing Oscar nomination data from JSON files with automatic TMDB ID verification, fuzzy matching, and a manual review UI for edge cases. Successfully imported 1,409 movies with 99.7% auto-verification rate. Incremental import tested and verified - safely adds new categories without data loss.

## When to Use This Skill

- **Importing new Oscar categories** - Use incremental script (currently: 6 imported, 28 available)
- **Expanding coverage** - Safe to add categories without data loss
- **Annual updates** - Append new ceremony data and run incremental import
- **Verifying/correcting TMDB IDs** - Use manual review UI at `/oscars/review`

**Current Status (January 2025):**
- 6 categories imported: Best Picture, Actor, Actress, Director, Supporting Actor, Supporting Actress
- 1,409 movies with 100% verified TMDB IDs
- 2,913 nominations (ceremony years 1929-2024)
- 28 additional categories ready for import

---

## Prerequisites

### 1. Database Schema

The schema includes review tracking fields (already implemented):

```prisma
enum ReviewStatus {
  pending
  auto_verified
  needs_manual_review
  manually_reviewed
}

model OscarMovie {
  id                  Int               @id @default(autoincrement())
  tmdb_id             Int?              @unique
  imdb_id             String?           @unique
  title               String
  review_status       ReviewStatus      @default(pending)
  verification_notes  String?
  confidence_score    Float?
  reviewed_at         DateTime?
  reviewed_by         String?
  created_at          DateTime          @default(now())
  updated_at          DateTime          @updatedAt
  nominations         OscarNomination[]
}
```

### 2. Source Data

**File:** `/oscar-nominations.json` (root directory)

**Coverage:** 1927/28 to 2023 (10,568 nominations, 34 categories)

**Structure:**
```json
{
  "category": "Best Picture",
  "year": "2023",
  "nominees": ["Nominee Name"],
  "movies": [{
    "title": "Movie Title",
    "tmdb_id": 12345,
    "imdb_id": "tt1234567"
  }],
  "won": true
}
```

### 3. Environment Variables

```bash
TMDB_API_KEY="your_bearer_token_here"  # Use Bearer token format
DATABASE_URL="your_postgresql_url"
```

---

## Import Process

### Step 1: Configure Target Categories

Edit `scripts/import-oscars.js`:

```javascript
const TARGET_CATEGORIES = ['Best Picture', 'Best Actor', 'Best Actress', 'Best Director'];
```

**For all 34 categories:** Remove this filter entirely.

### Step 2: Run Import Script

```bash
node scripts/import-oscars.js
```

**What It Does:**
1. Clears existing Oscar data (categories, movies, nominations)
2. Extracts unique movies from JSON for target categories
3. Verifies each movie against TMDB API (with rate limiting)
4. Assigns review status based on verification
5. Creates Oscar categories, movies, and nominations

**Expected Runtime:** ~5-10 minutes for 1,150 movies (250ms delay between requests)

### Step 3: Review Output

```
🎉 Import completed successfully!
📈 Final Stats:
   Categories: 4
   Movies Created: 1150
   Movies Verified: 1150
     ✓ Auto-verified: 1140 (99%)
     ⚠ Needs Review: 10 (1%)
   Nominations: 2033
   Errors: 0
```

---

## Verification Algorithm

### Fuzzy Title Matching

**Similarity Threshold:** 85%

```javascript
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')  // Remove articles
    .replace(/[^\w\s]/g, '')          // Remove special chars
    .replace(/\s+/g, ' ')             // Normalize whitespace
    .trim();
}
```

**Examples of Successful Matches:**
- "King's Speech" ↔ "The King's Speech" ✓
- "tick, tick... BOOM!" ↔ "tick, tick...BOOM!" ✓

### Year Matching

**Rule:** `ceremony_year - 1` with ±1 year tolerance

**Convention:** The database uses actual ceremony year (when the awards took place)
- Ceremony 2023 (March 2023) → Expected film release 2022 (±1 = 2021-2023)
- Ceremony 2024 (March 2024) → Expected film release 2023 (±1 = 2022-2024)

**Note:** The JSON source data uses film release year, but `normalizeYear()` automatically converts to ceremony year by adding +1.

**Examples:**
- JSON: "2022" → Database: 2023 (95th Academy Awards, March 2023)
- JSON: "2023" → Database: 2024 (96th Academy Awards, March 2024)
- Allows for festival releases, late releases, international dates

### Auto-Verification Criteria

A movie is **auto-verified** if:
1. Title similarity ≥ 85%
2. Release year within ±1 year of expected

Otherwise flagged as **needs_manual_review** with detailed notes.

### Confidence Scoring

```javascript
confidence_score = titleSimilarity  // 0.0 to 1.0

// Visual indicators:
// 90-100%: Green (high confidence)
// 70-89%: Yellow (medium confidence)
// 0-69%: Red (low confidence)
```

---

## Manual Review Workflow

### Access Review UI

**URL:** `/oscars/review` (admin-only)

**Features:**
- Filter by review status (needs review, pending, verified)
- Search movies by title
- Progress stats dashboard
- One-click review with modal

### Review Modal Features

**Auto-populated search:** `"Movie Title" year:YYYY`

**Context displayed:**
- Ceremony year → Expected release year
- Verification notes (why flagged)
- Confidence score visualization
- Current TMDB ID (if exists)

**Actions:**
- **Search & Select:** Find correct TMDB match
- **Keep Original:** Confirm flagged movie is correct
- **Skip for Now:** Defer decision

**Result:** Status updated to `manually_reviewed`

### Common Edge Cases

1. **Year Mismatches**
   - Festival releases (premiere year ≠ wide release)
   - International releases
   - COVID-delayed ceremonies (2020 → 2021 films)

2. **Title Variations**
   - Foreign films with multiple titles
   - Subtitle differences
   - Special characters

3. **Multiple Movies Per Nomination**
   - Early Oscars allowed actors nominated for 2+ films
   - Script handles: creates separate nomination for each

---

## API Endpoints

### 1. Review Queue

```typescript
GET /api/oscars/movies/review-queue?status=needs_manual_review&status=pending

Response: {
  success: true,
  data: OscarMovie[],
  count: number
}
```

### 2. Review Stats

```typescript
GET /api/oscars/movies/review-stats

Response: {
  success: true,
  data: {
    total: number,
    auto_verified: number,
    needs_manual_review: number,
    manually_reviewed: number,
    pending: number,
    verified: number,
    needs_action: number,
    completion_percentage: number
  }
}
```

### 3. Update Movie

```typescript
PATCH /api/oscars/movies/[id]

Body: {
  tmdb_id: number,
  review_status?: 'manually_reviewed',
  verification_notes?: string | null,
  reviewed_by?: string
}

Response: {
  success: true,
  data: OscarMovie
}
```

---

## Expanding to New Categories

### ✅ Recommended: Incremental Import (Safe for Production)

**Use this method to preserve existing verified data when adding new categories.**

1. Run incremental import with category names as arguments:
   ```bash
   node scripts/import-oscars-incremental.js "Best Supporting Actress" "Best Original Screenplay"
   ```

2. The script automatically:
   - Checks for existing categories and skips them
   - Preserves existing movies and their review_status
   - Verifies only NEW movies with TMDB API
   - Creates nominations while preventing duplicates
   - Reports movies created, preserved, and verification stats

3. Review any flagged movies via `/oscars/review`

**Example Output:**
```
🎬 Starting INCREMENTAL Oscar nominations import...
📂 Target categories: Best Supporting Actress
📊 Loaded 10568 total nominations, filtered to 440 for target categories
✅ Found 290 movies already in database (will skip verification)
🔍 Verifying NEW movies with TMDB...
✅ Verified 114 new movies
   Auto-verified: 114
   Needs review: 0
   Skipped (existing): 290
💾 Inserting 114 new movies
🏆 Creating 440 new nominations
🎉 Import completed successfully!
```

**Benefits:**
- Zero data loss - existing verified movies preserved
- Faster - skips re-verification of existing movies
- Safe - can run multiple times without corruption
- Tested - verified with Best Supporting Actress import

### ⚠️ Alternative: Full Import (Use Only for Initial Setup)

**WARNING: Deletes all existing Oscar data. Only use for complete reset.**

1. Update `TARGET_CATEGORIES` in `scripts/import-oscars.js`
2. Run `node scripts/import-oscars.js`
3. Review flagged movies via `/oscars/review`

**Use incremental import instead unless you need to rebuild everything.**

---

## Performance Optimization

### Rate Limiting

**Current:** 250ms delay between TMDB requests

**Formula:** `(movies * 250ms) / 1000 / 60 = minutes`
- 1,000 movies = ~4 minutes
- 5,000 movies = ~20 minutes

**To speed up:** Reduce RATE_LIMIT_DELAY (risk: TMDB rate limits)

### Batch Processing

```javascript
// Process in chunks for progress updates
if (verifiedCount % 50 === 0) {
  console.log(`Progress: ${verifiedCount}/${totalMovies} (${percent}%)`);
}
```

### Caching

**Future enhancement:** Cache TMDB responses to avoid re-verification

---

## Troubleshooting

### Issue: 401 Authentication Error

**Symptom:** All movies flagged with "TMDB API error: 401"

**Solution:** Verify Bearer token format
```javascript
headers: {
  'Authorization': `Bearer ${TMDB_API_KEY}`,  // Not api_key query param!
  'Content-Type': 'application/json'
}
```

### Issue: High False-Positive Rate (>5%)

**Symptoms:**
- Title variations with accents, colons, quotes
- Foreign film translations

**Solution:** Adjust similarity threshold
```javascript
const titleThreshold = 0.80;  // Lower from 0.85 for more lenient matching
```

### Issue: Year Mismatches for Specific Decade

**Example:** 2020 ceremony → 2021 releases (COVID delay)

**Solution:** Adjust year tolerance for specific ranges
```javascript
const expectedYear = ceremonyYear - 1;
const tolerance = ceremonyYear === 2020 ? 2 : 1;  // Special case
const yearMatch = Math.abs(expectedYear - tmdbYear) <= tolerance;
```

### Issue: Duplicate Nominations

**Symptom:** Same movie, year, category appears multiple times

**Cause:** Multiple nominees (actors, crew) for same film

**Expected behavior:** Each nominee gets separate nomination record

---

## Quality Assurance

### Post-Import Verification

Run validation script:
```bash
node scripts/verify-oscar-tmdb-ids.ts
```

**Checks:**
- All TMDB IDs exist in TMDB database
- Title matches are reasonable
- Year ranges are correct
- No missing critical data

### Spot Check Recommendations

1. **Recent winners (2020-2023):** Should be 100% accurate
2. **Oldest films (1927-1940):** Higher mismatch risk
3. **Foreign films:** Check for title translation issues
4. **High confidence scores (>95%):** Rarely need review
5. **Low confidence scores (<70%):** Always review

---

## Future Enhancements

### 1. Bulk Update Endpoint

```typescript
POST /api/oscars/movies/bulk-update

Body: {
  updates: [
    { id: 1, tmdb_id: 12345, review_status: 'manually_reviewed' },
    { id: 2, tmdb_id: 67890, review_status: 'manually_reviewed' }
  ]
}
```

### 2. AI-Assisted Matching

Use Claude/GPT to suggest matches for ambiguous titles:
- Multiple release years
- Similar titles
- Foreign language variations

### 3. Historical Audit Trail

Track all TMDB ID changes:
```sql
CREATE TABLE oscar_movie_audit (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER REFERENCES oscar_movies(id),
  old_tmdb_id INTEGER,
  new_tmdb_id INTEGER,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT
);
```

### 4. Webhook Integration

Auto-update when TMDB data changes (title corrections, merges)

---

## Success Metrics

### Current Performance (6 Categories - January 2025)

- **Total Movies:** 1,409
- **Auto-verified:** 1,405 (99.7%)
- **Manually Reviewed:** 4 (0.3%)
- **Needs Review:** 0 (100% complete)
- **Categories:** Best Picture, Actor, Actress, Director, Supporting Actor, Supporting Actress
- **Nominations:** 2,913
- **Import Time:** ~5-7 minutes per initial category import
- **Incremental Import Time:** ~2-3 minutes (skips existing movies)

### Incremental Import Test Results (Best Supporting Actress)

**Test Date:** January 2025
**Command:** `node scripts/import-oscars-incremental.js "Best Supporting Actress"`

**Results:**
- ✅ Created 1 new category
- ✅ Found 290 existing movies and **skipped re-verification** (preserved review_status)
- ✅ Verified 114 new movies (100% auto-verified, 0 flagged)
- ✅ Created 440 new nominations
- ✅ Zero errors
- ✅ Existing 4 manually reviewed movies preserved
- ✅ Database: 1,295 → 1,409 movies (100% verified)

**Performance:**
- Import time: ~2 minutes (114 movies verified)
- Existing data: 100% preserved
- Data loss: Zero

**Conclusion:** Incremental import is production-ready and safe for expanding to remaining 28 categories.

### Expected for All 34 Categories

- **Total Movies:** ~5,000-6,000
- **Auto-verified:** ~4,900 (98-99%)
- **Needs Review:** ~50-100 (1-2%)
- **Full Import Time:** ~20-30 minutes (first run)
- **Incremental Imports:** ~2-5 minutes each (skips existing movies)
- **Manual Review Time:** ~1-2 hours total

---

## Related Documentation

- **Architecture:** [oscars.md](../oscars.md) - Complete Oscar system design
- **API Patterns:** [api-auth-patterns.md](../api-auth-patterns.md)
- **TMDB Integration:** [tmdb-integration.md](./tmdb-integration.md)
- **Database Migrations:** [database-migration.md](./database-migration.md)

---

## Quick Reference

### Import New Categories

```bash
# 1. Edit target categories
vim scripts/import-oscars.js

# 2. Run import
node scripts/import-oscars.js

# 3. Review flagged movies
# Navigate to: http://localhost:3000/oscars/review
```

### Check Status

```bash
# Count by status
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function stats() {
  const counts = await prisma.oscarMovie.groupBy({
    by: ['review_status'],
    _count: true
  });
  console.table(counts);
  await prisma.\$disconnect();
}
stats();
"
```

### Manual SQL Fixes

```sql
-- Update single movie
UPDATE oscar_movies
SET tmdb_id = 12345,
    review_status = 'manually_reviewed',
    verification_notes = NULL,
    reviewed_at = NOW()
WHERE id = 1;

-- Bulk mark as reviewed
UPDATE oscar_movies
SET review_status = 'manually_reviewed',
    reviewed_at = NOW()
WHERE review_status = 'auto_verified'
  AND confidence_score >= 0.95;
```

---

## Notes for Future Claude Sessions

1. **Preservation:** This import method is proven and should not be significantly altered
2. **Extensions:** New categories follow same pattern—just update TARGET_CATEGORIES
3. **Verification threshold:** 85% title similarity + ±1 year is optimal
4. **Edge cases:** Year mismatches are most common flag (100% title match but year off)
5. **Admin access:** Review UI requires admin role in database
6. **Rate limiting:** 250ms is safe for TMDB API (40 requests/10 seconds limit)

---

**Last Updated:** January 2025
**Verified By:** Import of 1,409 movies (6 categories) + incremental import test
**Success Rate:** 99.7% auto-verification (1,405/1,409 movies)
**Incremental Import:** Tested and verified with Best Supporting Actress (290 existing movies preserved, 114 new movies added)
