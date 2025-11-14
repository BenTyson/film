# Database Backup Skill

Guide for creating, managing, and restoring PostgreSQL database backups for the Film project.

## Quick Backup Command

### One-Line Backup (Recommended)

```bash
/opt/homebrew/opt/postgresql@17/bin/pg_dump --clean --if-exists $DATABASE_URL > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

**What this does:**
- Uses PostgreSQL 17 (matches Railway server version)
- Creates timestamped backup file
- Includes `--clean` for safe restores
- Includes `--if-exists` to prevent errors

---

## Automated Backup Script

### Create Backup Script

```bash
# Create scripts/backup-db.sh
cat > scripts/backup-db.sh << 'EOF'
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
KEEP_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "📦 Creating database backup..."
/opt/homebrew/opt/postgresql@17/bin/pg_dump --clean --if-exists $DATABASE_URL > "$BACKUP_FILE"

# Verify backup
if [ -s "$BACKUP_FILE" ]; then
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  LINE_COUNT=$(wc -l < "$BACKUP_FILE" | tr -d ' ')

  echo "✅ Backup created successfully!"
  echo "   File: $BACKUP_FILE"
  echo "   Size: $FILE_SIZE"
  echo "   Lines: $LINE_COUNT"
else
  echo "❌ Backup failed - file is empty"
  exit 1
fi

# Clean up old backups (older than KEEP_DAYS)
echo ""
echo "🧹 Cleaning up old backups (older than ${KEEP_DAYS} days)..."
find "$BACKUP_DIR" -name "backup_*.sql" -type f -mtime +${KEEP_DAYS} -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/backup_*.sql 2>/dev/null | wc -l | tr -d ' ')
echo "   Backups remaining: $REMAINING"

echo ""
echo "✨ Backup complete!"
EOF

# Make executable
chmod +x scripts/backup-db.sh
```

### Usage

```bash
# Run backup
./scripts/backup-db.sh

# Output:
# 📦 Creating database backup...
# ✅ Backup created successfully!
#    File: backups/backup_20251113_180619.sql
#    Size: 2.5M
#    Lines: 12053
# 🧹 Cleaning up old backups (older than 30 days)...
#    Backups remaining: 5
# ✨ Backup complete!
```

---

## When to Create Backups

### Always Backup Before:

1. **Database Migrations**
   ```bash
   ./scripts/backup-db.sh
   npx prisma migrate dev --name add_new_feature
   ```

2. **Major Deployments**
   ```bash
   ./scripts/backup-db.sh
   git push origin main  # Triggers Railway deployment
   ```

3. **Data Imports**
   ```bash
   ./scripts/backup-db.sh
   node scripts/import-oscars.js
   ```

4. **Schema Changes**
   ```bash
   ./scripts/backup-db.sh
   npx prisma db push
   ```

5. **Testing Destructive Operations**
   ```bash
   ./scripts/backup-db.sh
   # Now safe to test dangerous operations
   ```

### Regular Schedule (Recommended)

Create backups:
- **Daily**: If actively developing
- **Weekly**: If in maintenance mode
- **Before each deploy**: Always

---

## Backup Best Practices

### ✅ DO:

- **Keep multiple backups** (at least 3-5 recent ones)
- **Test restores occasionally** (verify backups work)
- **Backup before migrations** (safety net)
- **Store off-server** (git, cloud storage, external drive)
- **Use timestamped filenames** (easy to identify)
- **Automate backups** (use scripts or cron jobs)

### ❌ DON'T:

- **Don't rely on Railway alone** (no automatic backups on free/hobby plans)
- **Don't delete all backups** (keep at least one recent backup)
- **Don't commit large backups to git** (>10MB files, use .gitignore)
- **Don't forget to test restores** (backup is useless if you can't restore)

---

## Backup Storage

### Option 1: Local Storage (Current)

```bash
# .gitignore
backups/*.sql
!backups/.gitkeep
```

**Pros:** Fast, simple, free
**Cons:** Lost if computer fails

### Option 2: Git Repository (Small DBs)

```bash
# For databases under 10MB
git add backups/backup_20251113.sql
git commit -m "Database backup before admin deployment"
git push
```

**Pros:** Version controlled, free
**Cons:** GitHub has 100MB file limit

### Option 3: Cloud Storage

```bash
# Upload to cloud (example: AWS S3, Google Drive, Dropbox)
cp backups/backup_20251113_180619.sql ~/Dropbox/film-backups/
```

**Pros:** Off-site, safe from local failures
**Cons:** Requires setup

### Option 4: External Drive

```bash
# Copy to external drive
cp backups/backup_*.sql /Volumes/Backup/film-db/
```

**Pros:** Complete isolation, fast access
**Cons:** Manual process

---

## Restoring from Backup

### Full Database Restore

⚠️ **WARNING: This will delete all current data!**

```bash
# 1. Verify you have the right backup
ls -lh backups/backup_20251113_180619.sql

# 2. Preview first 50 lines to verify
head -50 backups/backup_20251113_180619.sql

# 3. Restore database (DESTRUCTIVE!)
psql $DATABASE_URL < backups/backup_20251113_180619.sql
```

### Test Restore (Local Database)

```bash
# 1. Create test database
createdb film_restore_test

# 2. Restore to test database
psql postgresql://localhost/film_restore_test < backups/backup_20251113_180619.sql

# 3. Verify data
psql postgresql://localhost/film_restore_test -c "SELECT COUNT(*) FROM users;"

# 4. Clean up when done
dropdb film_restore_test
```

### Partial Restore (Single Table)

```bash
# Extract single table from backup
grep -A 10000 "COPY public.users" backups/backup_20251113_180619.sql | \
grep -B 10000 "\\\\." > users_only.sql

# Restore just that table
psql $DATABASE_URL < users_only.sql
```

---

## Backup File Structure

### What's in a Backup File?

```sql
-- 1. Header & Settings
SET statement_timeout = 0;
SET client_encoding = 'UTF8';

-- 2. Drop Constraints
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT...

-- 3. Drop Tables
DROP TABLE IF EXISTS public.users;

-- 4. Create Tables
CREATE TABLE public.users (
    id integer NOT NULL,
    clerk_id character varying(255) NOT NULL,
    ...
);

-- 5. Copy Data
COPY public.users (id, clerk_id, email, name, role, created_at) FROM stdin;
1	user_abc123	ben@example.com	Ben	admin	2024-01-15
\.

-- 6. Restore Constraints
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- 7. Indexes
CREATE INDEX idx_user_clerk ON public.users USING btree (clerk_id);
```

---

## Backup Size Management

### Check Backup Sizes

```bash
# List all backups with sizes
ls -lh backups/*.sql

# Total backup directory size
du -sh backups/

# Largest backups
ls -lhS backups/*.sql | head -5
```

### Compress Large Backups

```bash
# Compress backup (saves 80-90% space)
gzip backups/backup_20251113_180619.sql
# Creates: backup_20251113_180619.sql.gz

# Restore from compressed backup
gunzip -c backups/backup_20251113_180619.sql.gz | psql $DATABASE_URL
```

### Automated Compression Script

```bash
# Add to backup-db.sh after creating backup
if [ -f "$BACKUP_FILE" ]; then
  echo "📦 Compressing backup..."
  gzip "$BACKUP_FILE"
  COMPRESSED_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
  echo "   Compressed: $COMPRESSED_SIZE"
fi
```

---

## Railway-Specific Considerations

### Railway Database Backups

**Railway does NOT provide automatic backups** on free/hobby plans.

**Manual backup via Railway:**
```bash
# Option 1: Using pg_dump directly
railway run -- /opt/homebrew/opt/postgresql@17/bin/pg_dump $DATABASE_URL > backup.sql

# Option 2: Export from Railway dashboard
# 1. Go to Railway dashboard
# 2. Select your database
# 3. Click "Data" tab
# 4. Export manually (if available)
```

**Point-in-time Recovery:**
- Available on Pro plans only
- Requires configuration
- Not enabled by default

### Production Backup Strategy

For production deployments:

```bash
# 1. Backup before deployment
./scripts/backup-db.sh

# 2. Deploy to Railway
git push origin main

# 3. Monitor deployment logs
railway logs

# 4. If issues occur, restore backup
psql $DATABASE_URL < backups/backup_20251113_180619.sql
```

---

## Automated Backup Schedule

### Using Cron (macOS/Linux)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /Users/bentyson/film && ./scripts/backup-db.sh >> backups/cron.log 2>&1

# Or weekly on Sunday at 2 AM
0 2 * * 0 cd /Users/bentyson/film && ./scripts/backup-db.sh >> backups/cron.log 2>&1
```

### Using launchd (macOS)

Create `~/Library/LaunchAgents/com.film.backup.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.film.backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/bentyson/film/scripts/backup-db.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
</dict>
</plist>
```

Load the agent:
```bash
launchctl load ~/Library/LaunchAgents/com.film.backup.plist
```

---

## Backup Verification

### Verify Backup Integrity

```bash
# Check backup can be parsed
/opt/homebrew/opt/postgresql@17/bin/pg_restore --list backups/backup_20251113_180619.sql > /dev/null

# Count tables in backup
grep "^CREATE TABLE" backups/backup_20251113_180619.sql | wc -l

# Check for critical tables
grep "CREATE TABLE public.users" backups/backup_20251113_180619.sql
grep "CREATE TABLE public.movies" backups/backup_20251113_180619.sql
grep "CREATE TABLE public.activity_logs" backups/backup_20251113_180619.sql
```

### Compare Backup to Live Database

```bash
# Get table counts from live database
psql $DATABASE_URL -c "SELECT COUNT(*) as users FROM users;"
psql $DATABASE_URL -c "SELECT COUNT(*) as movies FROM movies;"

# Compare to backup
# (Restore to test database and check counts)
```

---

## Troubleshooting

### Backup File is Empty

**Cause:** Connection error or permissions issue

**Solution:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Verify DATABASE_URL is set
echo $DATABASE_URL
```

### Version Mismatch Error

**Error:** `server version: 17.6; pg_dump version: 14.18`

**Solution:**
```bash
# Use PostgreSQL 17 pg_dump
/opt/homebrew/opt/postgresql@17/bin/pg_dump $DATABASE_URL > backup.sql

# Or install matching version
brew install postgresql@17
```

### Restore Fails with Constraint Errors

**Cause:** Data integrity violations

**Solution:**
```bash
# Use --clean flag in backup
/opt/homebrew/opt/postgresql@17/bin/pg_dump --clean --if-exists $DATABASE_URL > backup.sql

# This drops tables before recreating them
```

### Backup Too Large for Git

**Problem:** GitHub rejects files over 100MB

**Solution:**
```bash
# Compress before committing
gzip backups/backup_20251113_180619.sql

# Or exclude from git
echo "backups/*.sql" >> .gitignore
```

---

## Example Workflow

### Pre-Deployment Backup Workflow

```bash
# 1. Create backup
echo "📦 Creating pre-deployment backup..."
./scripts/backup-db.sh

# 2. Build and test locally
npm run build
npm run lint

# 3. Deploy to Railway
git add .
git commit -m "Deploy admin dashboard with activity logging"
git push origin main

# 4. Monitor deployment
railway logs --follow

# 5. Verify deployment successful
# (Check admin dashboard at https://your-app.railway.app/admin)

# 6. If successful, backup is your safety net
# 7. If failed, restore from backup:
#    psql $DATABASE_URL < backups/backup_20251113_180619.sql
```

---

## Related Documentation

- **Database Migration:** [database-migration.md](./database-migration.md) - Schema changes workflow
- **Admin Operations:** [admin-operations.md](./admin-operations.md) - Admin dashboard usage
- **Architecture:** [../architecture.md](../architecture.md) - Database schema overview
- **Process:** [../process.md](../process.md) - Deployment and maintenance workflows
