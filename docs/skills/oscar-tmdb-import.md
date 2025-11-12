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

## Person Data Population (Actors, Actresses, Directors)

**Added:** January 2025
**Status:** Production-ready (99.8% success rate - 2,303/2,307 nominations)

### Overview

Beyond movie TMDB IDs, the system now populates actor, actress, and director profile data from TMDB's person database. This enables rich UI features like profile thumbnails in the Oscar table view.

### Database Schema for Person Data

```prisma
model OscarNomination {
  id            Int           @id @default(autoincrement())
  ceremony_year Int
  category_id   Int
  movie_id      Int?
  nominee_name  String?
  person_id     Int?          // TMDB person ID
  profile_path  String?       // TMDB profile image path
  is_winner     Boolean       @default(false)
  // ... other fields
}
```

**Key Fields:**
- `nominee_name`: Already in source data (`oscar-nominations.json`)
- `person_id`: TMDB person identifier (enables linking to actor/director details)
- `profile_path`: Path to profile image (e.g., `/abc123.jpg` → `https://image.tmdb.org/t/p/w185/abc123.jpg`)

### TMDB Client Enhancements

**Added to `/src/lib/tmdb.ts`:**

```typescript
// Search for person by name
async searchPerson(name: string): Promise<TMDBPersonSearchResponse>

// Get detailed person info by ID
async getPersonDetails(personId: number): Promise<TMDBPersonDetails>

// Construct profile image URL
getProfileURL(path: string, size: 'w45' | 'w185' | 'h632' | 'original'): string
```

**Person Interface:**
```typescript
interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;  // "Acting" or "Directing"
  popularity: number;
}
```

### Population Scripts

#### 1. Test Script (5 nominations)

**File:** `scripts/test-person-matching.js`

**Purpose:** Validate the person matching process before running on all data

**Command:**
```bash
node scripts/test-person-matching.js
```

**What It Does:**
- Fetches 5 unprocessed nominations (mix of acting + director categories)
- Searches TMDB for each nominee by name
- Filters results by `known_for_department` ("Acting" vs "Directing")
- Selects most popular/best match
- Updates `person_id` and `profile_path` in database
- Reports success/failure for each

**Example Output:**
```
=== Testing Person Matching with 5 Nominations ===
Found 5 person categories: Best Actor, Best Actress, ...
Processing 5 nominations...

✅ Emil Jannings → Emil Jannings (ID: 2895)
✅ Janet Gaynor → Janet Gaynor (ID: 9088)
✅ Frank Borzage → Frank Borzage (ID: 14855)

SUMMARY: 5/5 successful (100%)
```

#### 2. Full Population Script

**File:** `scripts/populate-oscar-people.js`

**Purpose:** Process all 2,307 nominations with person data

**Command:**
```bash
node scripts/populate-oscar-people.js
```

**Features:**
- **Batch processing:** 50 nominations at a time with progress updates
- **Rate limiting:** 350ms delay between TMDB requests (safe for API limits)
- **Retry logic:** 3 attempts for failed API calls
- **Smart filtering:** Only processes person categories (Actor, Actress, Director, Supporting)
- **Department matching:** Filters TMDB results by `known_for_department` for accuracy
- **Incremental:** Only processes nominations where `person_id IS NULL` (safe to re-run)
- **Detailed logging:** Saves to `scripts/oscar-people-populate.log`
- **Failure export:** Creates CSV of failed matches for manual review

**Categories Processed:**
- Best Actor
- Best Actress
- Best Supporting Actor
- Best Supporting Actress
- Best Director

**Example Output:**
```
=== Populating All Oscar Nominations with Person Data ===
Found 2307 nominations to process

--- Batch 1/47 (1-50/2307) ---
[1/2307] Gloria Swanson (Best Actress, 1929)... ✅ Gloria Swanson
[2/2307] King Vidor (Best Director, 1929)... ✅ King Vidor
...

=== FINAL SUMMARY ===
Total processed: 2307
Successful: 2303
Failed: 4
Success rate: 99.8%

Completed at: 2025-01-11T22:59:58.836Z
Log saved to: scripts/oscar-people-populate.log
```

**Runtime:** ~17-18 minutes for 2,307 nominations

### Matching Algorithm

**1. Search by Name**
```javascript
const results = await searchPerson(nomination.nominee_name);
```

**2. Filter by Department**
```javascript
// For acting categories
const actingResults = results.filter(p => p.known_for_department === 'Acting');

// For director category
const directingResults = results.filter(p => p.known_for_department === 'Directing');
```

**3. Select Best Match**
```javascript
// Return most popular match (first result after filtering)
return filtered[0];
```

**Why This Works:**
- TMDB search ranks by popularity/relevance
- Department filtering eliminates wrong people with same name
- For well-known Oscar nominees, TMDB data is highly accurate

### UI Integration

**Oscar Table View** (`/oscars` → Table View):

**For Person Categories:**
- Displays 28px circular profile thumbnails
- Shows nominee names in clean stacked rows
- Winners: Bold text + subtle yellow glow background
- Fallback User icon for 4 nominees without images

**Image URLs:**
```javascript
`https://image.tmdb.org/t/p/w185${nom.profile_path}`
```

**Component:** `src/components/oscar/OscarTableView.tsx`

### Success Metrics

**Production Results (January 2025):**
- **Total Nominations:** 2,307
- **Successfully Matched:** 2,303 (99.8%)
- **Failed Matches:** 4 (0.2%)
- **Categories:** 5 (Actor, Actress, Supporting Actor, Supporting Actress, Director)
- **Unique People:** ~1,500+ individuals
- **With Profile Images:** ~2,000+ nominations (87%)
- **Processing Time:** 17.5 minutes

**Failure Analysis:**
The 4 failed matches were likely due to:
- Spelling variations in very old nominations (1920s-1930s)
- Name changes or stage names
- Very obscure early cinema figures not in TMDB database

### Future Enhancements

1. **Manual Override UI**
   - Review interface for the 4 failed matches
   - Search and manually select correct TMDB person
   - Similar to Oscar movie review UI at `/oscars/review`

2. **Caching Layer**
   - Cache TMDB person searches to speed up re-runs
   - Avoid redundant API calls for duplicate names

3. **Expanded Categories**
   - Add person data for cinematographers, writers, composers
   - When expanding to other Oscar categories beyond current 6

4. **Person Detail Pages**
   - Click on actor thumbnail → modal with full filmography
   - Link to all their Oscar nominations/wins
   - Use `getPersonDetails()` to fetch bio, birthday, etc.

### Troubleshooting

**Issue: No profile images showing in UI**

**Check:**
1. Database has `profile_path` populated:
   ```sql
   SELECT COUNT(*) FROM oscar_nominations
   WHERE nominee_name IS NOT NULL
   AND profile_path IS NOT NULL;
   ```
2. Image URLs are constructed correctly (should have `/t/p/w185/` in path)
3. TMDB API key has image access permissions

**Issue: Wrong person matched**

**Symptoms:**
- Profile image doesn't match expected person
- Name is similar but different person (e.g., "John Smith" the actor vs director)

**Solution:**
- Check `known_for_department` filter is working
- Manually update in database:
  ```sql
  UPDATE oscar_nominations
  SET person_id = correct_id,
      profile_path = '/correct_path.jpg'
  WHERE id = nomination_id;
  ```

**Issue: Rate limiting errors**

**Symptoms:**
- Script fails midway with 429 errors
- Many "Rate limited, waiting..." messages

**Solution:**
- Increase `RATE_LIMIT_DELAY` in script (currently 350ms)
- Script auto-retries with 2-second backoff
- Can safely re-run - only processes `WHERE person_id IS NULL`

### Quick Reference

**Run Population:**
```bash
# Test with 5 nominations first
node scripts/test-person-matching.js

# Run full population
node scripts/populate-oscar-people.js
```

**Check Status:**
```sql
-- Count populated
SELECT COUNT(*) as populated
FROM oscar_nominations
WHERE nominee_name IS NOT NULL
AND person_id IS NOT NULL;

-- Count by category
SELECT c.name,
       COUNT(*) as total,
       COUNT(n.person_id) as with_person_data
FROM oscar_nominations n
JOIN oscar_categories c ON n.category_id = c.id
WHERE n.nominee_name IS NOT NULL
GROUP BY c.name;
```

**View Failures:**
```bash
cat scripts/oscar-people-failures.csv
```

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
