# System Architecture

## Overview

The Job Importer system is designed as a scalable, queue-based processing system that fetches job data from multiple external APIs, processes them in batches, and stores them in MongoDB with comprehensive tracking.

## Architecture Diagram

```
┌─────────────┐
│   Client    │  Next.js Admin UI
│  (Next.js)  │  Port: 3000
└──────┬──────┘
       │ HTTP
       │
┌──────▼──────────────────────────────────────┐
│         Express Server                       │
│         Port: 3001                           │
│  ┌──────────────────────────────────────┐   │
│  │  Routes                               │   │
│  │  - /api/import/trigger                │   │
│  │  - /api/history                       │   │
│  └──────────────┬────────────────────────┘   │
│                 │                              │
│  ┌──────────────▼────────────────────────┐   │
│  │  Controllers                          │   │
│  │  - ImportController                   │   │
│  │  - HistoryController                  │   │
│  └──────────────┬────────────────────────┘   │
│                 │                              │
│  ┌──────────────▼────────────────────────┐   │
│  │  Services                             │   │
│  │  - FetchService                       │   │
│  │  - ParserService                      │   │
│  │  - QueueService                       │   │
│  │  - JobService                         │   │
│  └──────────────┬────────────────────────┘   │
└─────────────────┼────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼──────┐   ┌────────▼────────┐
│   MongoDB    │   │     Redis       │
│              │   │   (BullMQ)      │
│  - jobs      │   │                 │
│  - import_   │   │  Queue:         │
│    logs      │   │  job-import-    │
│              │   │  queue          │
└──────────────┘   └────────┬────────┘
                            │
                  ┌─────────▼─────────┐
                  │   Worker Process  │
                  │   (BullMQ)        │
                  │   Concurrency: 5  │
                  └───────────────────┘
```

## Component Details

### 1. Frontend (Next.js)

**Technology**: Next.js 14 with TypeScript

**Components**:
- `ImportHistory` - Displays import history table with pagination
- Real-time updates every 30 seconds
- Clean, minimal UI (black/white with light blue accents)

**Key Features**:
- Responsive table layout
- Pagination support
- Status indicators (processing/completed/failed)
- Auto-refresh functionality

### 2. Backend (Express)

**Technology**: Node.js with Express and TypeScript

#### 2.1 Routes Layer
- **Purpose**: Define API endpoints
- **Files**: `routes/import.ts`, `routes/history.ts`
- **Responsibilities**:
  - Handle HTTP requests
  - Validate input
  - Call controllers

#### 2.2 Controllers Layer
- **Purpose**: Handle business logic
- **Files**: `controllers/ImportController.ts`, `controllers/HistoryController.ts`
- **Responsibilities**:
  - Orchestrate service calls
  - Handle errors
  - Return responses

#### 2.3 Services Layer

**FetchService**:
- Fetches XML data from external APIs
- Handles HTTP errors and timeouts
- Manages list of configured API URLs

**ParserService**:
- Converts XML to JSON
- Handles different RSS/XML formats
- Extracts job data (title, company, description, etc.)
- Generates unique external IDs

**QueueService**:
- Manages BullMQ queue
- Batches jobs for processing
- Handles queue operations
- Provides queue statistics

**JobService**:
- Creates/updates jobs in MongoDB
- Manages import logs
- Tracks statistics (new/updated/failed)
- Finalizes import logs when complete

#### 2.4 Models Layer
- **Job Model**: Stores job data with unique constraint on `externalId` + `sourceUrl`
- **ImportLog Model**: Tracks import statistics and status

#### 2.5 Workers
- **Technology**: BullMQ Workers
- **Purpose**: Process queued jobs in background
- **Features**:
  - Configurable concurrency (default: 5)
  - Retry logic with exponential backoff
  - Batch processing
  - Error handling

#### 2.6 Cron Jobs
- **Purpose**: Automatically fetch jobs on schedule
- **Default**: Every hour (`0 * * * *`)
- **Configurable**: Via `JOB_FETCH_INTERVAL` environment variable

### 3. Database (MongoDB)

#### Collections

**jobs**:
```typescript
{
  title: string;
  company: string;
  location?: string;
  description?: string;
  url?: string;
  category?: string;
  type?: string;
  region?: string;
  externalId: string;      // Unique per source
  sourceUrl: string;        // API URL
  publishedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `externalId` + `sourceUrl` (unique)
- `title` (for search)
- `sourceUrl` (for filtering)

**import_logs**:
```typescript
{
  fileName: string;         // URL path
  sourceUrl: string;        // Full URL
  timestamp: Date;
  total: number;
  new: number;
  updated: number;
  failed: number;
  failedReasons: Array<{
    jobId?: string;
    reason: string;
    error?: string;
  }>;
  status: 'completed' | 'failed' | 'processing';
  processingTime?: number;
  totalBatches: number;
  completedBatches: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `timestamp` (descending, for sorting)
- `sourceUrl` (for filtering)

### 4. Queue System (Redis + BullMQ)

**Queue Name**: `job-import-queue`

**Job Data Structure**:
```typescript
{
  sourceUrl: string;
  jobs: Array<ParsedJob>;
  importLogId: string;
}
```

**Features**:
- Batch processing (configurable batch size)
- Retry mechanism (3 attempts with exponential backoff)
- Job persistence
- Queue statistics

**Worker Configuration**:
- Concurrency: Configurable (default: 5)
- Remove completed jobs after 1 hour
- Remove failed jobs after 24 hours

## Data Flow

### Import Process Flow

1. **Trigger** (Manual or Cron):
   ```
   ImportController.triggerImport()
   ```

2. **Fetch**:
   ```
   FetchService.fetchJobsFromUrl(url)
   → Returns XML string
   ```

3. **Parse**:
   ```
   ParserService.parseXMLToJSON(xmlData)
   → Returns Array<ParsedJob>
   ```

4. **Create Log**:
   ```
   JobService.createImportLog(sourceUrl, total, batchCount)
   → Creates ImportLog in MongoDB
   ```

5. **Queue**:
   ```
   QueueService.addJobImport(data)
   → Batches jobs and adds to Redis queue
   ```

6. **Process** (Worker):
   ```
   Worker processes batch
   → JobService.processJobBatch(data)
   → Creates/updates jobs in MongoDB
   → Updates ImportLog statistics
   → Increments completed batches
   → Finalizes log when all batches complete
   ```

### History View Flow

1. **Request**:
   ```
   GET /api/history?page=1&limit=50
   ```

2. **Controller**:
   ```
   HistoryController.getImportHistory(limit, skip)
   ```

3. **Service**:
   ```
   JobService.getImportHistory(limit, skip)
   → Returns paginated ImportLog documents
   ```

4. **Response**:
   ```
   {
     data: ImportLog[],
     pagination: {
       total, page, limit, pages
     }
   }
   ```

## Scalability Considerations

### Horizontal Scaling

1. **Workers**: Multiple worker processes can run simultaneously
   - Each worker connects to the same Redis queue
   - BullMQ handles job distribution
   - Concurrency can be adjusted per worker

2. **API Server**: Multiple Express instances can run behind a load balancer
   - Stateless design
   - Shared MongoDB and Redis

3. **Database**: MongoDB can be scaled with replica sets or sharding
   - Read replicas for history queries
   - Sharding for large job collections

### Performance Optimizations

1. **Batch Processing**: Jobs are processed in batches to reduce database operations
2. **Indexing**: Strategic indexes on frequently queried fields
3. **Queue Management**: Automatic cleanup of old jobs
4. **Connection Pooling**: MongoDB and Redis connection pooling

### Future Enhancements

1. **Microservices**: Can be split into:
   - API Gateway
   - Import Service
   - Worker Service
   - History Service

2. **Real-time Updates**: WebSocket/SSE for live import status
3. **Caching**: Redis cache for frequently accessed data
4. **Monitoring**: Integration with monitoring tools (Prometheus, Grafana)
5. **Rate Limiting**: Protect external APIs from excessive requests

## Error Handling

### Fetch Errors
- Timeout handling (30 seconds)
- Retry logic for transient failures
- Error logging

### Parse Errors
- Graceful handling of malformed XML
- Skip invalid entries
- Log parsing failures

### Database Errors
- Transaction support for batch operations
- Failed jobs logged with reasons
- Import continues even if some jobs fail

### Queue Errors
- Exponential backoff retry
- Failed job tracking
- Dead letter queue for persistent failures

## Security Considerations

1. **Input Validation**: All inputs validated before processing
2. **CORS**: Configured for frontend origin
3. **Environment Variables**: Sensitive data in `.env` files
4. **Error Messages**: Generic error messages to avoid information leakage

## Testing Strategy

1. **Unit Tests**: Services and utilities
2. **Integration Tests**: API endpoints
3. **Worker Tests**: Queue processing
4. **E2E Tests**: Full import flow

## Deployment

### Development
- Local MongoDB and Redis
- Development mode with hot reload

### Production
- MongoDB Atlas (cloud database)
- Redis Cloud (cloud Redis)
- Environment-specific configurations
- Process managers (PM2, systemd)
- Docker containerization (optional)

## Technology Choices

### Why Express over NestJS?
- Simpler setup for this use case
- Faster development
- Sufficient for current requirements
- Can migrate to NestJS if needed

### Why BullMQ over Bull?
- BullMQ is the modern, actively maintained version
- Better TypeScript support
- Improved performance
- Better Redis connection handling

### Why MongoDB?
- Flexible schema for job data
- Easy to scale
- Good performance for read-heavy workloads
- Native JSON support

### Why Next.js?
- Server-side rendering capabilities
- Built-in API routes (if needed)
- Excellent developer experience
- Production-ready optimizations

## Monitoring & Observability

### Logging
- Console logging for development
- Structured logging for production
- Error tracking

### Metrics (Future)
- Import success rate
- Processing time
- Queue depth
- Database query performance

## Conclusion

This architecture provides:
- **Scalability**: Queue-based processing allows horizontal scaling
- **Reliability**: Error handling and retry mechanisms
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add new features or APIs
- **Performance**: Batch processing and efficient database operations

