-- Hashtag Tracking Database Helper Queries
-- Use with: psql hashtag_tracking -f db-helper.sql
-- Or copy and paste individual queries in psql

-- ==========================================
-- 1. View All Tables
-- ==========================================
\dt

-- ==========================================
-- 2. Check Hashtag Records
-- ==========================================
SELECT 'Hashtags:' as section;
SELECT id, name, hashtag_id, created_at FROM hashtags;

-- ==========================================
-- 3. Count Media Records
-- ==========================================
SELECT 'Media Count by Hashtag:' as section;
SELECT hashtag_id, COUNT(*) as count FROM media GROUP BY hashtag_id;

-- ==========================================
-- 4. Recent Media Records
-- ==========================================
SELECT 'Latest 5 Media Records:' as section;
SELECT
  id,
  hashtag_id,
  media_id,
  caption,
  media_type,
  like_count,
  comments_count,
  created_at
FROM media
ORDER BY created_at DESC
LIMIT 5;

-- ==========================================
-- 5. Check for Duplicates
-- ==========================================
SELECT 'Potential Duplicates:' as section;
SELECT hashtag_id, media_id, COUNT(*) as count
FROM media
GROUP BY hashtag_id, media_id
HAVING COUNT(*) > 1;

-- ==========================================
-- 6. Media Statistics
-- ==========================================
SELECT 'Media Statistics:' as section;
SELECT
  COUNT(*) as total_media,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record,
  ROUND(AVG(like_count::numeric), 2) as avg_likes,
  ROUND(AVG(comments_count::numeric), 2) as avg_comments,
  COUNT(CASE WHEN local_asset_path IS NOT NULL THEN 1 END) as with_local_assets,
  COUNT(CASE WHEN local_asset_path IS NULL THEN 1 END) as without_local_assets
FROM media;

-- ==========================================
-- 7. Media Type Distribution
-- ==========================================
SELECT 'Media Type Distribution:' as section;
SELECT media_type, COUNT(*) as count
FROM media
GROUP BY media_type;

-- ==========================================
-- 8. Top Media by Likes
-- ==========================================
SELECT 'Top 5 Media by Likes:' as section;
SELECT
  media_id,
  caption,
  like_count,
  comments_count,
  created_at
FROM media
ORDER BY like_count DESC
LIMIT 5;

-- ==========================================
-- 9. Database Size
-- ==========================================
SELECT 'Database Information:' as section;
SELECT
  datname,
  pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname = 'hashtag_tracking';

-- ==========================================
-- 10. Table Sizes
-- ==========================================
SELECT 'Table Sizes:' as section;
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ==========================================
-- Cleanup Queries (Use with caution!)
-- ==========================================

-- Clear all media records (keep hashtags):
-- DELETE FROM media;

-- Reset auto-increment:
-- TRUNCATE media RESTART IDENTITY;
-- TRUNCATE hashtags RESTART IDENTITY;

-- Drop all tables:
-- DROP TABLE IF EXISTS media CASCADE;
-- DROP TABLE IF EXISTS hashtags CASCADE;
