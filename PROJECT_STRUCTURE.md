# Project Structure Documentation

## Directory Layout

```
saral/
├── src/                          # TypeScript source code
│   ├── app.ts                    # Main application entry point
│   ├── types.ts                  # TypeScript type definitions
│   ├── api/
│   │   └── routes.ts             # Express route handlers
│   ├── db/
│   │   ├── connection.ts         # PostgreSQL connection pool
│   │   └── migrations.ts         # Database schema setup
│   ├── services/
│   │   ├── metaService.ts        # Instagram Graph API wrapper
│   │   ├── hashtagService.ts     # Hashtag database operations
│   │   ├── mediaService.ts       # Media CRUD operations
│   │   └── syncService.ts        # Orchestrates media syncing
│   ├── queue/
│   │   └── queue.ts              # In-memory job queue
│   ├── storage/
│   │   └── storage.ts            # Local file storage handler
│   └── cron/
│       └── jobs.ts               # Scheduled tasks
├── dist/                         # Compiled JavaScript (generated)
├── node_modules/                 # Dependencies (generated)
├── storage/                      # Local media storage (generated)
│   └── media/                    # Downloaded media files
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── README.md                     # Project overview
├── QUICKSTART.md                 # Quick setup guide
├── instructions.md               # Detailed setup and documentation
└── PROJECT_STRUCTURE.md          # This file
```

## File Descriptions

### Root Configuration Files

- **package.json**: NPM project configuration, dependencies, and scripts
- **tsconfig.json**: TypeScript compiler configuration
- **.env**: Environment variables (includes API credentials)
- **.env.example**: Template for environment variables
- **.gitignore**: Files to exclude from git

### Documentation

- **README.md**: Project overview and features
- **QUICKSTART.md**: Fast setup guide for getting started
- **instructions.md**: Complete setup, configuration, and design decisions
- **PROJECT_STRUCTURE.md**: This file

### Source Code (`src/`)

#### Core Application
- **app.ts**: Bootstrap the application
  - Loads environment variables
  - Runs database migrations
  - Registers queue handlers
  - Schedules cron jobs
  - Starts Express server

#### Type Definitions
- **types.ts**: TypeScript interfaces for all major entities
  - `InstagramMedia`: Raw Instagram API response
  - `MediaRecord`: Database media record
  - `Hashtag`: Hashtag record
  - `QueueJob`: Job queue item
  - `PaginationParams` & `PaginatedResponse`: API pagination

#### API Layer (`api/`)
- **routes.ts**: Express route handlers
  - `GET /hashtags` - List all media (paginated)
  - `GET /hashtags/:name` - List media for hashtag
  - `POST /sync/top` - Queue top media sync
  - `POST /sync/recent` - Queue recent media sync
  - `GET /health` - Health check

#### Service Layer (`services/`)

- **metaService.ts**: Instagram Graph API integration
  - `getHashtagId()` - Get Instagram hashtag ID by name
  - `getTopMedia()` - Fetch top media with pagination
  - `getRecentMedia()` - Fetch recent media with pagination
  - Internal pagination handling for up to 500 items

- **hashtagService.ts**: Hashtag data management
  - `getOrCreate()` - Get existing or create new hashtag
  - `getByName()` - Look up hashtag by name
  - `getById()` - Look up hashtag by ID

- **mediaService.ts**: Media data management
  - `mediaExists()` - Check for duplicate media
  - `createMedia()` - Insert new media record
  - `getMediaByHashtag()` - Get media for specific hashtag
  - `getAllMedia()` - Get all media (with pagination)
  - `getMediaCount()` - Count media for hashtag

- **syncService.ts**: Orchestrates the sync process
  - `syncTopMedia()` - Fetch and store top media
  - `syncRecentMedia()` - Fetch and store recent media
  - Handles: API calls, duplicate checking, asset download, DB storage

#### Infrastructure Layer

**Queue** (`queue/`)
- **queue.ts**: In-memory job queue
  - `enqueue()` - Add job to queue
  - `registerHandler()` - Register job type handlers
  - `process()` - Process jobs sequentially
  - `getQueueLength()` - Queue status

**Storage** (`storage/`)
- **storage.ts**: Local file storage handler
  - `downloadAndStore()` - Download media from URL and save locally
  - `fileExists()` - Check if file exists
  - `getStoragePath()` - Get storage directory path

**Database** (`db/`)
- **connection.ts**: PostgreSQL connection pool
  - Manages database connections with error handling

- **migrations.ts**: Database schema setup
  - `hashtags` table: Stores hashtag information
  - `media` table: Stores media metadata
  - Indexes for efficient queries
  - Unique constraint for duplicate prevention

**Scheduling** (`cron/`)
- **jobs.ts**: Scheduled tasks
  - Every 3 hours: Enqueue recent media sync for matcha hashtag

## Data Flow

```
1. Request arrives at API endpoint
         ↓
2. Route handler processes request
         ↓
3. Service layer handles business logic
         ↓
4. Database layer performs CRUD operations
         ↓
5. Response returned to client
```

### Sync Flow

```
1. Cron job triggers every 3 hours (or manual API call)
         ↓
2. Job enqueued to queue
         ↓
3. Queue handler invokes syncService
         ↓
4. metaService fetches data from Instagram API
         ↓
5. For each media item:
   - Check if duplicate (mediaService)
   - Download asset (storageService)
   - Save to database (mediaService)
         ↓
6. Sync completed with results logged
```

## Database Schema

### hashtags table
```sql
CREATE TABLE hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  hashtag_id VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### media table
```sql
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag_id VARCHAR(255) NOT NULL,
  media_id VARCHAR(255) NOT NULL,
  caption TEXT,
  media_type VARCHAR(50) NOT NULL,
  media_url TEXT NOT NULL,
  permalink TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  timestamp TIMESTAMP NOT NULL,
  local_asset_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(hashtag_id, media_id),
  FOREIGN KEY (hashtag_id) REFERENCES hashtags(hashtag_id),
  INDEX ON created_at DESC,
  INDEX ON media_id
);
```

## Build & Runtime Process

### Build Process
1. `npm install` - Install dependencies from package.json
2. `npm run build` - Compile TypeScript to JavaScript in `dist/`
3. `npm run db:migrate` - Create database tables and indexes

### Runtime Process
1. `npm start` - Run compiled application
2. Load `.env` variables
3. Connect to PostgreSQL
4. Run any pending migrations
5. Register queue job handlers
6. Schedule cron jobs
7. Enqueue initial top media sync
8. Start Express server on configured port

## Key Technologies

- **Express.js**: Web framework for HTTP API
- **TypeScript**: Type-safe JavaScript
- **PostgreSQL**: Relational database for persistence
- **node-cron**: Task scheduling library
- **Axios**: HTTP client for Instagram API
- **pg**: PostgreSQL client for Node.js

## Configuration Points

All configuration is environment-based via `.env` file:

- Database connection string
- Instagram API credentials
- Server port
- Storage path
- Environment mode (development/production)

## Security Considerations

- Environment variables for sensitive data (API tokens, DB credentials)
- Parameterized SQL queries to prevent injection
- Error messages don't leak sensitive information
- File operations validated and sandboxed to storage directory
- Input validation on pagination parameters
