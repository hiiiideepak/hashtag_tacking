# Hashtag Tracking System - Instructions

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd saral
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create database**
   ```bash
   # Create PostgreSQL database
   createdb hashtag_tracking
   ```

4. **Configure environment variables**
   ```bash
   # Copy .env.example to .env
   cp .env.example .env
   ```

   Then update `.env` with your values (see vars section below)

5. **Build the project**
   ```bash
   npm run build
   ```

6. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

7. **Start the server**
   ```bash
   npm start
   ```

   For development with hot reload:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

## Vars

### Required Environment Variables

- **DATABASE_URL**: PostgreSQL connection string
  - Format: `postgresql://user:password@localhost:5432/hashtag_tracking`
  - Default: Not set - must be configured

- **INSTAGRAM_ACCESS_TOKEN**: Instagram Graph API access token
  - Provided in problem statement
  - Default: Not set - must be configured

- **INSTAGRAM_USER_ID**: Instagram business account ID
  - Value: `17841480695597364`
  - Default: Not set - must be configured

- **INSTAGRAM_API_VERSION**: Meta Graph API version
  - Default: `v24.0`
  - Can be updated to newer versions if needed

### Optional Environment Variables

- **PORT**: Server port
  - Default: `3000`

- **NODE_ENV**: Environment mode
  - Options: `development`, `production`
  - Default: `development`

- **STORAGE_PATH**: Local storage path for media assets
  - Default: `./storage/media`

## Tradeoffs

### 1. Local Storage vs Cloud Storage (S3)

**Decision**: Used local file storage instead of AWS S3

**Why**: 
- Simplifies deployment and testing
- No AWS credentials or service configuration needed
- Suitable for development and demonstration

**Tradeoff**:
- Not scalable for large deployments (disk space constraints)
- No geographic redundancy
- No built-in backup mechanism

**Future Migration**: The `StorageService` interface is abstracted, making it easy to swap to S3 implementation by creating an S3StorageService class

### 2. In-Memory Queue vs AWS SQS

**Decision**: Used in-memory job queue instead of AWS SQS

**Why**:
- No external service dependencies
- Simpler setup and testing
- Queue processes jobs synchronously

**Tradeoff**:
- Jobs are lost on server restart
- Not suitable for distributed systems
- Single-threaded processing (no concurrency)
- No job persistence or retry mechanisms

**Future Migration**: Queue interface is abstracted in `queue.ts`, making it straightforward to implement an SQS-based queue

### 3. Node Cron vs AWS EventBridge/Lambda

**Decision**: Used node-cron for scheduling instead of AWS EventBridge

**Why**:
- No AWS infrastructure needed
- Simple to implement and test locally
- Cron expression syntax is standard and portable

**Tradeoff**:
- Cron job runs on server process lifecycle
- No redundancy if server goes down
- Limited to single server (not distributed)
- Requires server to be running 24/7 for scheduled tasks

**Future Migration**: Cron scheduling can be moved to EventBridge by replacing the `scheduleCronJobs()` function

### 4. Database Design Choices

**Media Table Structure**:
- Chose to index on `created_at` for efficient pagination
- Added UNIQUE constraint on `(hashtag_id, media_id)` to prevent duplicates
- Store `local_asset_path` instead of full media binary to keep database lean
- Keep denormalized fields (like_count, comments_count) for query efficiency

**Why**: 
- Reduces database size while maintaining metadata
- Efficient pagination and duplicate detection
- Easy to refresh metadata by re-syncing

### 5. Pagination Implementation

**Decision**: Default limit of 20 items per page, max 100

**Why**:
- Reasonable default for API consumers
- Prevents excessive memory usage with large result sets
- Allows flexibility while maintaining safety

### 6. Media Download Strategy

**Decision**: Download media during sync, store locally, proceed without asset if download fails

**Why**:
- Ensures core metadata is always stored
- Graceful degradation if media is unavailable
- Media metadata remains queryable even if assets fail

**Tradeoff**:
- Asset download can be slow for large media collections
- No retry mechanism for failed downloads
- Could improve with background download queue

### 7. API Design

**Decision**: Single `/hashtags` endpoint that returns all media across hashtags

**Why**:
- Simple and clean API surface
- Can be extended with filtering later
- Follows REST conventions for listing resources

**Extensions Made**:
- `GET /hashtags?page=1&limit=20` - Paginated all media
- `GET /hashtags/:name?page=1&limit=20` - Media for specific hashtag
- `POST /sync/top` - Manually trigger top media sync
- `POST /sync/recent` - Manually trigger recent media sync
- `GET /health` - Health check endpoint

### 8. Error Handling

**Decision**: Graceful error handling with detailed logging

**Why**:
- Failed media records don't stop the sync process
- Allows visibility into what succeeds/fails
- Maintains system stability

**Tradeoff**:
- No automatic retry of failed operations
- Could improve with exponential backoff

## Testing

### Manual API Testing

```bash
# Health check
curl http://localhost:3000/health

# Get all media (paginated)
curl http://localhost:3000/hashtags?page=1&limit=20

# Manually trigger top media sync
curl -X POST http://localhost:3000/sync/top \
  -H "Content-Type: application/json"

# Manually trigger recent media sync
curl -X POST http://localhost:3000/sync/recent \
  -H "Content-Type: application/json"
```

### Database Inspection

```bash
# Connect to database
psql hashtag_tracking

# Check hashtags
SELECT * FROM hashtags;

# Check media count
SELECT COUNT(*) FROM media;

# Check latest media
SELECT id, media_id, caption, created_at FROM media ORDER BY created_at DESC LIMIT 10;

# Check for duplicates
SELECT hashtag_id, media_id, COUNT(*) FROM media GROUP BY hashtag_id, media_id HAVING COUNT(*) > 1;
```

## Architecture Notes

### Service Structure

The system is organized into clear layers:

1. **API Layer** (`/api`) - HTTP endpoints
2. **Service Layer** (`/services`) - Business logic
   - `metaService`: Instagram API integration
   - `hashtagService`: Hashtag management
   - `mediaService`: Media CRUD operations
   - `syncService`: Orchestration of syncing process
3. **Infrastructure Layer**
   - `queue`: Job queue for async tasks
   - `storage`: Media file storage
   - `db`: Database setup and migrations
   - `cron`: Scheduled jobs

### Data Flow

```
Cron Job / Manual API
    ↓
Queue → Handler
    ↓
SyncService
    ↓
MetaService (fetch from Instagram)
    ↓
StorageService (download media) + MediaService (save to DB)
```

## Future Improvements

1. **Robustness**: Add retry logic with exponential backoff
2. **Performance**: Implement batch media downloads with parallel processing
3. **Observability**: Add structured logging and metrics
4. **AWS Migration**: Replace local implementations with SQS, S3, EventBridge
5. **Testing**: Add unit and integration tests
6. **Caching**: Add Redis caching for frequently accessed data
7. **Rate Limiting**: Add rate limiting to API endpoints
8. **Authentication**: Add authentication/authorization if needed

## AI Usage

This implementation was developed using Claude Haiku 4.5 with the following approach:

**Tools Used**: Claude Code (Cursor-style AI assistant)

**What Claude was used for**:
- Project structure and architecture design
- Service layer implementation
- Database schema and migrations
- API route design
- Queue and cron job systems

**What was reviewed/tested manually**:
- Environment configuration
- Database connection strings
- API endpoint structure
- Queue job handlers
- Service integration points

**Verification approach**:
- Code follows TypeScript best practices
- Services are loosely coupled and testable
- Error handling includes logging for debugging
- Database operations use parameterized queries to prevent SQL injection
- Storage service handles file operations safely
