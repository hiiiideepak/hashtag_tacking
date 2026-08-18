# System Overview

Complete end-to-end Hashtag Tracking System for Instagram media ingestion and management.

## What Was Built

A production-ready backend system that:

1. **Fetches Instagram Media**: Integrates with Meta's Graph API to fetch top and recent media for hashtags
2. **Stores in PostgreSQL**: Persists media metadata with efficient schema and duplicate prevention
3. **Downloads Assets**: Stores media files locally (or can be configured for S3)
4. **Prevents Duplicates**: Unique constraints and pre-insert checks ensure no duplicate records
5. **Schedules Syncs**: Cron jobs automatically sync recent media every 3 hours
6. **Exposes Clean API**: RESTful endpoints for querying stored media with pagination
7. **Manages Async Tasks**: In-memory queue system for background job processing

## System Components

### 1. **API Layer** (Express.js)
- `GET /hashtags` - List all stored media (paginated)
- `POST /sync/top` - Manually trigger top media sync
- `POST /sync/recent` - Manually trigger recent media sync
- `GET /health` - Health check with queue status

### 2. **Service Layer**
- **MetaService**: Communicates with Instagram Graph API
  - Fetches hashtag IDs
  - Retrieves top and recent media
  - Handles pagination for up to 500 items per sync

- **HashtagService**: Manages hashtag records
  - Get or create hashtags
  - Track which hashtags are being monitored

- **MediaService**: CRUD operations for media
  - Create media records
  - Query with pagination
  - Check for duplicates

- **SyncService**: Orchestrates the sync process
  - Fetches from API
  - Downloads assets
  - Saves to database
  - Handles errors gracefully

### 3. **Infrastructure Layer**

**Database** (PostgreSQL)
- `hashtags` table: Tracks monitored hashtags
- `media` table: Stores media metadata
- Indexes for efficient pagination
- Unique constraints for duplicate prevention

**Queue** (In-Memory)
- Async job processing
- Job type registration
- Sequential processing with error handling

**Storage** (Local File System)
- Downloads media from Instagram URLs
- Stores locally for access
- Graceful degradation if downloads fail

**Scheduling** (Node Cron)
- Every 3 hours: Enqueue recent media sync
- Extensible for additional schedules

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Express API                       │
│  GET /hashtags | POST /sync/* | GET /health        │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼───┐  ┌────▼────┐  ┌───▼──────┐
   │ Routes │  │  Queue  │  │  Cron   │
   └────┬───┘  └────┬────┘  └───┬─────┘
        │           │            │
   ┌───▼─────────────▼────────────▼──────┐
   │         Service Layer              │
   │ ┌──────────────────────────────┐   │
   │ │ MetaService  HashtagService  │   │
   │ │ MediaService SyncService     │   │
   │ └──────────────────────────────┘   │
   └───┬──────┬──────────┬──────────────┘
       │      │          │
   ┌───▼┐ ┌──▼──┐   ┌───▼───────┐
   │ DB │ │ API │   │  Storage  │
   │ Pg │ │Meta │   │  (Local)  │
   └────┘ └─────┘   └───────────┘
```

## Data Flow

### Sync Process
```
Cron Trigger / Manual API Call
         ↓
Queue.enqueue() - Add job
         ↓
Queue.process() - Pick up job
         ↓
SyncService.sync*Media() - Orchestrate
         ↓
MetaService.getHashtagId() - Fetch hashtag ID
         ↓
HashtagService.getOrCreate() - Create/retrieve hashtag
         ↓
MetaService.getTopMedia() / getRecentMedia() - Fetch items
         ↓
For Each Media Item:
  ├─ MediaService.mediaExists() - Check duplicates
  ├─ StorageService.downloadAndStore() - Save asset
  └─ MediaService.createMedia() - Save to DB
         ↓
Sync Complete - Log results
```

### Query Process
```
Client Request: GET /hashtags?page=1&limit=20
         ↓
Express Route Handler
         ↓
MediaService.getAllMedia() - Query with pagination
         ↓
PostgreSQL - Execute query with LIMIT/OFFSET
         ↓
Database - Return paginated results
         ↓
API Response - Return to client with metadata
```

## File Structure

### Source Code (`src/`)
```
src/
├── app.ts                    # Bootstrap & setup
├── types.ts                  # TypeScript interfaces
├── api/routes.ts            # HTTP routes
├── services/                # Business logic
│   ├── metaService.ts
│   ├── hashtagService.ts
│   ├── mediaService.ts
│   └── syncService.ts
├── db/                      # Database layer
│   ├── connection.ts
│   └── migrations.ts
├── queue/queue.ts           # Job queue
├── storage/storage.ts       # File storage
└── cron/jobs.ts            # Scheduled tasks
```

### Configuration & Documentation
```
├── .env                     # Environment variables
├── .env.example            # Template
├── .gitignore              # Git config
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── README.md               # Project overview
├── QUICKSTART.md           # Quick setup
├── instructions.md         # Detailed guide
├── SYSTEM_OVERVIEW.md      # This file
├── PROJECT_STRUCTURE.md    # Code organization
├── TESTING.md              # Testing guide
├── DEPLOYMENT.md           # Deployment guide
├── test-api.sh            # API test script
└── db-helper.sql          # Database queries
```

## Key Features

### 1. Duplicate Prevention
- **Database Constraint**: `UNIQUE(hashtag_id, media_id)` ensures no duplicates at DB level
- **Pre-Insert Check**: Query database before creating records
- **Automatic Skipping**: Duplicate items logged but don't cause failures

### 2. Scalable Pagination
- Efficient OFFSET/LIMIT queries with indexes
- Configurable page size (default 20, max 100)
- Metadata includes total count and page info

### 3. Media Asset Management
- Downloads media files to local storage
- Continues without asset if download fails
- Stores path reference in database
- Easy to migrate to S3 later

### 4. Graceful Error Handling
- Failed media doesn't stop entire sync
- Detailed logging for debugging
- Queue continues processing after errors
- No data loss on partial failures

### 5. Scheduled Syncing
- Automatic every 3 hours (configurable)
- Can be triggered manually via API
- Asynchronous processing via queue
- No blocking operations

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js |
| **Language** | TypeScript |
| **Web Framework** | Express.js |
| **Database** | PostgreSQL |
| **HTTP Client** | Axios |
| **Scheduling** | node-cron |
| **File System** | Node.js fs |

## Database Schema

### Hashtags Table
```sql
CREATE TABLE hashtags (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE,
  hashtag_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP
);
```

### Media Table
```sql
CREATE TABLE media (
  id UUID PRIMARY KEY,
  hashtag_id VARCHAR(255) FOREIGN KEY,
  media_id VARCHAR(255),
  caption TEXT,
  media_type VARCHAR(50),
  media_url TEXT,
  permalink TEXT,
  like_count INTEGER,
  comments_count INTEGER,
  timestamp TIMESTAMP,
  local_asset_path VARCHAR(500),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(hashtag_id, media_id),
  INDEX on created_at DESC,
  INDEX on media_id
);
```

## API Reference

### Get Media (Paginated)
```
GET /hashtags?page=1&limit=20

Query Parameters:
- page: number (default: 1)
- limit: number 1-100 (default: 20)

Response:
{
  success: boolean,
  data: MediaRecord[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### Trigger Sync
```
POST /sync/top or /sync/recent

Body (optional):
{ "hashtag": "matcha" }

Response:
{
  success: boolean,
  message: string,
  queueLength: number
}
```

### Health Check
```
GET /health

Response:
{
  success: boolean,
  status: string,
  queueLength: number
}
```

## Configuration

All configuration via environment variables (`.env`):

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `INSTAGRAM_ACCESS_TOKEN` - Instagram Graph API token
- `INSTAGRAM_USER_ID` - Instagram business account ID

**Optional:**
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (default: development)
- `STORAGE_PATH` - Media storage directory (default: ./storage/media)
- `INSTAGRAM_API_VERSION` - API version (default: v24.0)

## Security

- ✅ **SQL Injection Prevention**: Parameterized queries
- ✅ **Sensitive Data**: Environment variables for credentials
- ✅ **Input Validation**: Pagination boundaries enforced
- ✅ **Error Messages**: No sensitive info in responses
- ✅ **File Operations**: Sandboxed to storage directory

## Performance

- **Database Indexes**: Created on frequently queried columns
- **Pagination**: Prevents loading entire dataset
- **Async Processing**: Non-blocking queue operations
- **Connection Pooling**: Reuses database connections

## Deployment Options

1. **Local Development**: `npm run dev`
2. **Local Production**: `npm start`
3. **PM2**: Process manager for Node.js
4. **Docker**: Containerized deployment
5. **AWS**: Can migrate to Lambda, SQS, S3, EventBridge

## Monitoring & Observability

### Logging
- Timestamped console logs with components
- Queue and job processing logs
- Sync progress and results
- Error tracking with context

### Health Checks
- `/health` endpoint shows queue status
- Database connectivity verified on startup
- API availability monitoring ready

### Database Monitoring
- Query performance via timing
- Table size tracking
- Duplicate detection queries
- Record growth monitoring

## Scalability Roadmap

### Current Implementation (Local)
- ✅ In-memory queue
- ✅ Local file storage
- ✅ Node cron scheduling
- ✅ Single server

### Phase 1: AWS Migration
- [ ] Migrate to SQS for queue
- [ ] Migrate to S3 for storage
- [ ] Migrate to EventBridge for scheduling
- [ ] Use CloudWatch for logging

### Phase 2: High Availability
- [ ] Database replication
- [ ] Load balancing
- [ ] Auto-scaling groups
- [ ] Disaster recovery setup

### Phase 3: Enterprise
- [ ] Authentication & authorization
- [ ] Rate limiting
- [ ] Caching layer
- [ ] Multiple hashtag support
- [ ] Webhook notifications

## Troubleshooting

See [TESTING.md](TESTING.md) and [QUICKSTART.md](QUICKSTART.md) for:
- Setup issues
- Database connection problems
- Instagram API errors
- Storage issues
- Performance debugging

## Getting Started

1. **Setup**: `npm install && npm run build && npm run db:migrate`
2. **Configure**: Copy `.env.example` to `.env`, update DATABASE_URL
3. **Run**: `npm start`
4. **Test**: `./test-api.sh` or see [TESTING.md](TESTING.md)

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

## Support Documentation

- **README.md** - Project overview and features
- **QUICKSTART.md** - Fast setup guide
- **instructions.md** - Complete configuration and tradeoffs
- **TESTING.md** - Comprehensive testing guide
- **DEPLOYMENT.md** - Production deployment guide
- **PROJECT_STRUCTURE.md** - Code organization
- **This File** - System architecture overview

---

**Status**: ✅ Ready for Testing

All components implemented and documented. System is ready for deployment.
