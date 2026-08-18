# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Database

```bash
# Make sure PostgreSQL is running
# Create the database
createdb hashtag_tracking
```

## 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
# DATABASE_URL=postgresql://user:password@localhost:5432/hashtag_tracking
# (Instagram credentials are already provided in .env.example)
```

## 4. Build and Run Migrations

```bash
npm run build
npm run db:migrate
```

## 5. Start the Server

```bash
npm start
```

The server will:
- ✅ Run database migrations
- ✅ Schedule cron jobs (every 3 hours for recent media sync)
- ✅ Automatically fetch initial top media for matcha hashtag
- ✅ Start HTTP server on port 3000

## 6. Test the System

```bash
# Check server health
curl http://localhost:3000/health

# Get stored media (paginated)
curl http://localhost:3000/hashtags

# Manually trigger sync (optional - already running on startup)
curl -X POST http://localhost:3000/sync/top \
  -H "Content-Type: application/json"
```

## Development Mode

For development with auto-reload:

```bash
npm run dev
```

## Database Inspection

```bash
# Connect to database
psql hashtag_tracking

# Useful queries:
SELECT COUNT(*) FROM media;
SELECT COUNT(*) FROM hashtags;
SELECT * FROM media ORDER BY created_at DESC LIMIT 5;
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running: `pg_isready`
- Check DATABASE_URL format in .env
- Verify database exists: `psql -l | grep hashtag_tracking`

### Instagram API Issues
- Verify credentials in .env
- Check that access token hasn't expired
- Ensure INSTAGRAM_USER_ID is correct

### Storage Issues
- Ensure write permissions for storage directory
- Check disk space: `df -h`
- Storage path defaults to `./storage/media`

## Architecture Overview

```
Express Server
├── API Routes (/hashtags, /sync/*, /health)
├── Queue System (in-memory job processing)
├── Cron Jobs (every 3 hours for recent media)
└── Services
    ├── MetaService (Instagram API calls)
    ├── HashtagService (hashtag management)
    ├── MediaService (media CRUD)
    ├── SyncService (orchestration)
    └── StorageService (local file storage)

PostgreSQL Database
├── hashtags (hashtag records)
└── media (media metadata)
```

See [instructions.md](instructions.md) for detailed documentation.
