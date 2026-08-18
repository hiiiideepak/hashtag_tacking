# Testing Guide

This document provides comprehensive testing strategies for the Hashtag Tracking Service.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 12+ running
- All dependencies installed: `npm install`
- Environment configured: `.env` file with database URL
- Server built: `npm run build`
- Database migrations run: `npm run db:migrate`

## 1. Automated API Testing

### Quick Test Script

Run the automated test script:

```bash
./test-api.sh
```

This will:
- Test health endpoint
- Fetch initial media
- Trigger top media sync
- Check queue status
- Fetch media again

### Manual cURL Tests

**Health Check:**
```bash
curl http://localhost:3000/health | jq
```

**Get All Media (Paginated):**
```bash
# Page 1, 20 items per page
curl "http://localhost:3000/hashtags?page=1&limit=20" | jq

# Different page
curl "http://localhost:3000/hashtags?page=2&limit=20" | jq

# Fewer items per page
curl "http://localhost:3000/hashtags?page=1&limit=5" | jq
```

**Trigger Sync:**
```bash
# Trigger top media sync
curl -X POST http://localhost:3000/sync/top \
  -H "Content-Type: application/json" \
  -d '{"hashtag": "matcha"}'

# Trigger recent media sync
curl -X POST http://localhost:3000/sync/recent \
  -H "Content-Type: application/json" \
  -d '{"hashtag": "matcha"}'
```

## 2. Database Inspection

### Using Database Helper Script

```bash
# Run all queries
psql hashtag_tracking -f db-helper.sql

# Or run individual queries in psql
psql hashtag_tracking
```

### Manual Database Queries

**Connect to Database:**
```bash
psql hashtag_tracking
```

**Check Tables:**
```sql
\dt
```

**View Hashtags:**
```sql
SELECT * FROM hashtags;
```

**View Recent Media:**
```sql
SELECT
  media_id,
  caption,
  media_type,
  like_count,
  created_at
FROM media
ORDER BY created_at DESC
LIMIT 10;
```

**Count Media:**
```sql
SELECT COUNT(*) as total FROM media;
SELECT hashtag_id, COUNT(*) as count FROM media GROUP BY hashtag_id;
```

**Check for Duplicates:**
```sql
SELECT hashtag_id, media_id, COUNT(*) as count
FROM media
GROUP BY hashtag_id, media_id
HAVING COUNT(*) > 1;
```

**Media Statistics:**
```sql
SELECT
  COUNT(*) as total_media,
  ROUND(AVG(like_count::numeric), 2) as avg_likes,
  ROUND(AVG(comments_count::numeric), 2) as avg_comments,
  COUNT(CASE WHEN local_asset_path IS NOT NULL THEN 1 END) as with_assets
FROM media;
```

## 3. Storage Verification

### Check Downloaded Assets

```bash
# List storage directory
ls -la ./storage/media/

# Count media files
find ./storage/media -type f | wc -l

# Check file sizes
du -sh ./storage/media/

# View specific file
file ./storage/media/<filename>
```

### Verify Asset Integrity

```bash
# Check if all media have corresponding local assets
psql hashtag_tracking -c "
  SELECT
    COUNT(*) as with_assets,
    COUNT(CASE WHEN local_asset_path IS NULL THEN 1 END) as without_assets
  FROM media;
"
```

## 4. Log Inspection

### Server Logs

Watch server logs during sync:

```bash
# Terminal 1 - Start server with visible logs
npm run dev

# Terminal 2 - Trigger sync
curl -X POST http://localhost:3000/sync/top \
  -H "Content-Type: application/json"
```

Look for:
- `[Queue] Job enqueued`
- `[SyncService] Starting top media sync`
- `[MetaService] Fetched X media items`
- `[Storage] Downloaded and stored`
- `[MediaService] Created media record`
- `[SyncService] completed: X created, Y skipped`

## 5. Performance Testing

### Load Testing

```bash
# Simple load test with Apache Bench (if installed)
ab -n 100 -c 10 "http://localhost:3000/hashtags?page=1&limit=20"

# Or with curl in a loop
for i in {1..10}; do
  curl -s "http://localhost:3000/hashtags?page=1&limit=20" > /dev/null
  echo "Request $i completed"
done
```

### Database Query Performance

```bash
# Time a query
psql hashtag_tracking

\timing

SELECT * FROM media ORDER BY created_at DESC LIMIT 20;
```

## 6. Edge Cases

### Test Pagination Boundaries

```bash
# Page 0 (invalid)
curl "http://localhost:3000/hashtags?page=0&limit=20"

# Limit 0 (invalid)
curl "http://localhost:3000/hashtags?page=1&limit=0"

# Limit > 100 (should cap at 100)
curl "http://localhost:3000/hashtags?page=1&limit=500"

# Non-numeric parameters
curl "http://localhost:3000/hashtags?page=abc&limit=xyz"
```

### Test Sync Behavior

```bash
# Trigger same sync twice - should create on first, skip duplicates on second
curl -X POST http://localhost:3000/sync/top \
  -H "Content-Type: application/json"

# Wait a moment
sleep 5

# Run again
curl -X POST http://localhost:3000/sync/top \
  -H "Content-Type: application/json"

# Check database - no new records should be created
psql hashtag_tracking -c "SELECT COUNT(*) FROM media;"
```

## 7. Scheduled Job Testing

### Manual Cron Trigger

The system automatically syncs every 3 hours. To test scheduling:

```bash
# Modify src/cron/jobs.ts to run every minute temporarily:
// cron.schedule("* * * * *", async () => {  // Every minute

# Rebuild
npm run build

# Start server and watch logs for scheduled runs
npm start
```

## 8. Complete Test Workflow

### Step-by-Step Test

1. **Initialize Database**
   ```bash
   npm run build
   npm run db:migrate
   ```

2. **Start Server**
   ```bash
   npm start
   # In another terminal, continue with steps 3-6
   ```

3. **Verify Initial State**
   ```bash
   curl http://localhost:3000/health | jq
   psql hashtag_tracking -c "SELECT COUNT(*) FROM media;"
   ```

4. **Trigger Sync**
   ```bash
   curl -X POST http://localhost:3000/sync/top \
     -H "Content-Type: application/json"
   ```

5. **Monitor Progress**
   ```bash
   # Watch server logs
   # Or check queue
   curl http://localhost:3000/health | jq '.queueLength'
   ```

6. **Verify Results**
   ```bash
   # Check database
   psql hashtag_tracking -c "SELECT COUNT(*) FROM media;"

   # Check storage
   ls -la ./storage/media/ | wc -l

   # Check API response
   curl "http://localhost:3000/hashtags?page=1&limit=5" | jq
   ```

## 9. Error Handling Tests

### Network Errors

```bash
# Test with invalid database URL
# Modify .env and restart - should show connection error

# Test with invalid Instagram token
# Modify INSTAGRAM_ACCESS_TOKEN and trigger sync
# Should see error in logs but not crash server
```

### Invalid Input

```bash
# Empty body
curl -X POST http://localhost:3000/sync/top

# Malformed JSON
curl -X POST http://localhost:3000/sync/top \
  -H "Content-Type: application/json" \
  -d '{invalid json}'

# Unknown endpoint
curl http://localhost:3000/invalid
```

## 10. Cleanup & Reset

### Reset for Fresh Testing

```bash
# Clear media records but keep hashtags
psql hashtag_tracking -c "DELETE FROM media;"

# Clear both tables
psql hashtag_tracking -c "TRUNCATE media RESTART IDENTITY; TRUNCATE hashtags RESTART IDENTITY;"

# Clear storage
rm -rf ./storage/media/*

# Verify clean state
curl http://localhost:3000/hashtags | jq
```

## Troubleshooting

### Server Won't Start

```bash
# Check if port is in use
lsof -i :3000

# Check database connection
PGPASSWORD=<password> psql -h localhost -U <user> -d hashtag_tracking -c "SELECT 1;"

# Check environment variables
cat .env | grep -E 'DATABASE|INSTAGRAM'
```

### No Media Appearing

```bash
# Check if sync is running
curl http://localhost:3000/health | jq '.queueLength'

# Check server logs for errors
# Verify Instagram token is valid:
curl "https://graph.facebook.com/v24.0/me?access_token=$INSTAGRAM_ACCESS_TOKEN"

# Check database for hashtag records
psql hashtag_tracking -c "SELECT * FROM hashtags;"
```

### Database Issues

```bash
# Check database connection
psql hashtag_tracking -c "SELECT 1;"

# Check table structure
psql hashtag_tracking -c "\d media"
psql hashtag_tracking -c "\d hashtags"

# Check indexes
psql hashtag_tracking -c "\d+ media"
```

## Success Criteria

- ✅ Server starts without errors
- ✅ Health endpoint responds
- ✅ Sync triggers successfully
- ✅ Media records appear in database
- ✅ Assets download to storage
- ✅ Pagination works correctly
- ✅ Duplicate detection prevents duplicates
- ✅ Scheduled job runs every 3 hours

See [QUICKSTART.md](QUICKSTART.md) and [instructions.md](instructions.md) for more details.
