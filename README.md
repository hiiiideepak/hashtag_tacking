# Hashtag Tracking Service

A scalable Instagram hashtag media tracking system built with Express, TypeScript, and PostgreSQL.

## Features

- 📸 **Media Ingestion**: Fetch top and recent media from Instagram hashtags
- 🔄 **Automatic Syncing**: Scheduled periodic syncs every 3 hours
- 💾 **Duplicate Prevention**: Automatic detection and prevention of duplicate media records
- 📦 **Asset Storage**: Download and store media assets locally
- 🔍 **Pagination API**: Clean, paginated API for retrieving stored media
- ⚙️ **Job Queue**: In-memory queue system for handling async tasks
- 📊 **Structured Database**: Postgres with optimized schema and indexes

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Scheduling**: node-cron
- **HTTP Client**: Axios
- **Local Storage**: Node.js fs module

## Project Structure

```
src/
├── app.ts              # Main application entry
├── types.ts            # TypeScript interfaces
├── api/
│   └── routes.ts       # API endpoints
├── services/
│   ├── metaService.ts     # Instagram API integration
│   ├── hashtagService.ts   # Hashtag management
│   ├── mediaService.ts     # Media CRUD operations
│   └── syncService.ts      # Sync orchestration
├── db/
│   ├── connection.ts    # Database connection
│   └── migrations.ts    # Schema migrations
├── queue/
│   └── queue.ts         # In-memory job queue
├── storage/
│   └── storage.ts       # Local file storage
└── cron/
    └── jobs.ts          # Scheduled tasks
```

## API Endpoints

### Get All Media (Paginated)
```
GET /hashtags?page=1&limit=20
```

Returns all stored media across all hashtags, ordered by creation time (descending).

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page, max 100 (default: 20)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "hashtag_id": "123456",
      "media_id": "insta-media-id",
      "caption": "Post caption",
      "media_type": "IMAGE",
      "media_url": "https://...",
      "permalink": "https://instagram.com/p/...",
      "like_count": 100,
      "comments_count": 5,
      "timestamp": "2024-01-01T00:00:00Z",
      "local_asset_path": "./storage/media/...",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25
  }
}
```

### Sync Top Media
```
POST /sync/top
```

Enqueue a job to fetch and store top media for matcha hashtag.

**Request Body** (optional):
```json
{
  "hashtag": "matcha"
}
```

### Sync Recent Media
```
POST /sync/recent
```

Enqueue a job to fetch and store recent media for matcha hashtag.

**Request Body** (optional):
```json
{
  "hashtag": "matcha"
}
```

### Health Check
```
GET /health
```

Check server status and queue length.

## Getting Started

See [QUICKSTART.md](QUICKSTART.md) for a quick setup guide.

For detailed setup instructions, configuration, and tradeoffs, see [instructions.md](instructions.md).

## How It Works

### Initial Setup
1. Server starts and runs database migrations
2. Cron jobs are scheduled (every 3 hours for recent media)
3. Initial top media sync is enqueued for the matcha hashtag

### Media Sync Process
1. Fetch hashtag ID from Instagram API
2. Create or retrieve hashtag record
3. Fetch media (top or recent) with pagination support
4. For each media item:
   - Check for duplicates
   - Download and store media asset locally
   - Create database record with metadata
5. Log results (created count, skipped duplicates)

### API Access
1. Client requests media via `/hashtags` endpoint
2. Server queries PostgreSQL with pagination
3. Results are returned in a paginated format
4. Client can request top media sync manually via POST endpoint

## Duplicate Prevention

The system prevents duplicate media through:

1. **Database Unique Constraint**: `(hashtag_id, media_id)` uniqueness
2. **Pre-insert Check**: Query database before creating new records
3. **Automatic Skipping**: Duplicate records are logged but don't cause failures

## Configuration

All configuration via environment variables in `.env` file. See [instructions.md](instructions.md) for details.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `INSTAGRAM_ACCESS_TOKEN`: Instagram Graph API token
- `INSTAGRAM_USER_ID`: Instagram business account ID
- `PORT`: Server port (default: 3000)
- `STORAGE_PATH`: Media storage directory (default: `./storage/media`)

## Design Decisions

### Local Storage vs Cloud Storage
- **Decision**: Local file storage
- **Rationale**: Simpler setup, no AWS dependencies
- **Trade-off**: Not scalable for large deployments

### In-Memory Queue vs SQS
- **Decision**: In-memory queue
- **Rationale**: No external dependencies, easier to test
- **Trade-off**: Jobs lost on restart, not distributed

### Node Cron vs EventBridge
- **Decision**: node-cron
- **Rationale**: Simple, no AWS infrastructure
- **Trade-off**: Tied to server process, not redundant

For more details, see the "Tradeoffs" section in [instructions.md](instructions.md).

## Future Enhancements

- [ ] Migrate to AWS S3 for storage
- [ ] Migrate to AWS SQS for job queue
- [ ] Migrate to AWS EventBridge for scheduling
- [ ] Add unit and integration tests
- [ ] Add retry logic with exponential backoff
- [ ] Implement parallel media downloads
- [ ] Add Redis caching
- [ ] Add structured logging and metrics
- [ ] Add API authentication and rate limiting

## Testing

### Manual Testing
```bash
# Health check
curl http://localhost:3000/health

# Get media
curl http://localhost:3000/hashtags?page=1&limit=10

# Trigger sync
curl -X POST http://localhost:3000/sync/top \
  -H "Content-Type: application/json"
```

### Database Testing
```bash
psql hashtag_tracking

# View all media
SELECT * FROM media ORDER BY created_at DESC;

# Count media
SELECT COUNT(*) FROM media;

# Check for duplicates
SELECT hashtag_id, media_id, COUNT(*) 
FROM media 
GROUP BY hashtag_id, media_id 
HAVING COUNT(*) > 1;
```

## License

This is a demonstration project for the BE assignment.

## Support

For issues with setup, see the "Troubleshooting" section in [QUICKSTART.md](QUICKSTART.md).

For detailed documentation, see [instructions.md](instructions.md).
