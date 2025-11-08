# Scalable Job Importer with Queue Processing & History Tracking

A scalable job import system that pulls data from external APIs, queues jobs using Redis, imports them into MongoDB using worker processes, and provides an admin UI to view import history.

## Architecture

- **Frontend**: Next.js (Admin UI)
- **Backend**: Node.js with Express
- **Database**: MongoDB (Mongoose)
- **Queue**: BullMQ
- **Queue Store**: Redis

## Project Structure

```
/client          → Next.js frontend (admin UI)
/server          → Node.js Express backend
  ├── config/    → env, Redis, MongoDB connections
  ├── models/    → Job, ImportLog schemas
  ├── routes/    → Express routes (e.g., /import, /history)
  ├── controllers/ → Business logic handlers
  ├── services/  → Fetch, Parser, Queue, JobService
  ├── workers/   → BullMQ worker files
  ├── cron/      → Scheduled job fetcher
  └── utils/     → XML to JSON, logger, etc.
/README.md
/docs/architecture.md
```

## Features

- ✅ Multiple API integration (Jobicy.com, HigherEdJobs)
- ✅ XML to JSON parsing
- ✅ Queue-based background processing with BullMQ
- ✅ Configurable batch processing
- ✅ Import history tracking (total, new, updated, failed)
- ✅ Hourly cron job for automatic fetching
- ✅ Admin UI for viewing import history
- ✅ Error handling and retry logic with exponential backoff
- ✅ Real-time status updates

## Prerequisites

- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- Redis (local or Redis Cloud)
- npm or yarn

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Project
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```env
PORT=3001
NODE_ENV=development

# MongoDB Configuration
# For MongoDB Atlas (replace <db_password> with your actual password):
MONGODB_URI=mongodb+srv://lokesh:<db_password>@cluster1.wcyq2sb.mongodb.net/job_importer?appName=Cluster1

# For local MongoDB:
# MONGODB_URI=mongodb://localhost:27017/job_importer

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

QUEUE_NAME=job-import-queue
BATCH_SIZE=50
MAX_CONCURRENCY=5

JOB_FETCH_INTERVAL=0 * * * *
```

**Important**: Replace `<db_password>` in the MongoDB Atlas connection string with your actual database password!

### 3. Frontend Setup

```bash
cd ../client
npm install
```

Create a `.env.local` file in the `client` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 4. Database Setup

**Important**: MongoDB collections are created automatically when you insert the first document. You don't need to manually create tables!

#### Optional: Initialize Indexes

To set up indexes for better performance (optional):

```bash
cd server
npm run init-db
```

This will create indexes on the `jobs` and `import_logs` collections.

#### Start MongoDB and Redis

Make sure MongoDB and Redis are running on your system.

**MongoDB:**
```bash
# If installed locally
mongod
```

**Redis:**
```bash
# If installed locally
redis-server
```

**Note**: Collections (`jobs` and `import_logs`) will be created automatically when you trigger the first import.

#### Start Backend Server

```bash
cd server
npm run dev
```

#### Start Worker (in a separate terminal)

```bash
cd server
npm run worker
```

#### Start Frontend

```bash
cd client
npm run dev
```

## Usage

### Manual Import Trigger

Trigger import for all configured APIs:
```bash
curl -X POST http://localhost:3001/api/import/trigger
```

Trigger import for a specific URL:
```bash
curl -X POST "http://localhost:3001/api/import/trigger/https%3A%2F%2Fjobicy.com%2F%3Ffeed%3Djob_feed"
```

### View Import History

Open your browser and navigate to:
```
http://localhost:3000
```

The admin UI displays:
- File Name (URL path)
- Total jobs fetched
- New jobs created
- Updated jobs
- Failed jobs
- Status (processing/completed/failed)
- Processing time
- Timestamp

### API Endpoints

- `POST /api/import/trigger` - Trigger import for all APIs
- `POST /api/import/trigger/:url` - Trigger import for specific URL
- `GET /api/history` - Get import history (supports `page` and `limit` query params)

## Configuration

### Environment Variables

**Backend (`server/.env`):**
- `PORT` - Server port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `REDIS_PASSWORD` - Redis password (optional)
- `QUEUE_NAME` - BullMQ queue name
- `BATCH_SIZE` - Number of jobs per batch (default: 50)
- `MAX_CONCURRENCY` - Worker concurrency (default: 5)
- `JOB_FETCH_INTERVAL` - Cron expression for scheduled fetching (default: hourly)

**Frontend (`client/.env.local`):**
- `NEXT_PUBLIC_API_URL` - Backend API URL

## How It Works

1. **Fetching**: The system fetches job data from configured APIs (XML format)
2. **Parsing**: XML responses are converted to JSON
3. **Queueing**: Jobs are batched and added to Redis queue
4. **Processing**: Worker processes consume jobs from the queue
5. **Storage**: Jobs are created/updated in MongoDB
6. **Tracking**: Import logs track statistics for each import run
7. **UI**: Admin interface displays import history

## Job Sources

The system integrates with the following APIs:

- Jobicy.com feeds (multiple categories)
- HigherEdJobs RSS feed

All configured URLs are automatically fetched hourly via cron job.

## Assumptions

1. MongoDB and Redis are accessible and running
2. External APIs are accessible and return valid XML/RSS feeds
3. Job uniqueness is determined by `externalId` + `sourceUrl` combination
4. Failed jobs are logged but don't stop the import process
5. Import logs are finalized when all batches complete

## Development

### Build for Production

**Backend:**
```bash
cd server
npm run build
npm start
```

**Frontend:**
```bash
cd client
npm run build
npm start
```

## Troubleshooting

### MongoDB Connection Issues
- Verify MongoDB is running
- Check `MONGODB_URI` in `.env`
- Ensure MongoDB is accessible from your network

### Redis Connection Issues
- Verify Redis is running
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`
- Test Redis connection: `redis-cli ping`

### Worker Not Processing Jobs
- Ensure worker process is running
- Check Redis connection
- Verify queue name matches in both server and worker

### Import History Not Updating
- Check worker logs for errors
- Verify MongoDB connection
- Ensure import log is being created and updated

## License

ISC

