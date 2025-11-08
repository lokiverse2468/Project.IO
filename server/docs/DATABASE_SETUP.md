# MongoDB Database Setup

## How MongoDB Collections Work

In MongoDB, you **don't need to manually create tables/collections**. Collections are created automatically when you insert the first document.

However, it's recommended to:
1. **Initialize indexes** for better query performance
2. **Verify database connection** before running the application

## Quick Setup

### Option 1: Automatic (Recommended)

Just start the application! Collections will be created automatically when the first job is imported.

```bash
cd server
npm run dev
```

When you trigger an import, the collections will be created:
- `jobs` - Created when first job is inserted
- `import_logs` - Created when first import log is created

### Option 2: Initialize Indexes First

Run the initialization script to create indexes before starting the application:

```bash
cd server
npm run init-db
```

This will:
- Connect to MongoDB
- Create indexes for better performance
- Verify the setup

## Collections Structure

### 1. `jobs` Collection

**Created automatically** when first job is inserted.

**Schema:**
```typescript
{
  title: string;           // Job title
  company: string;         // Company name
  location?: string;        // Job location
  description?: string;    // Job description
  url?: string;            // Job URL
  category?: string;       // Job category
  type?: string;           // Job type (full-time, etc.)
  region?: string;         // Job region
  externalId: string;      // Unique ID from source
  sourceUrl: string;       // Source API URL
  publishedDate?: Date;    // Publication date
  createdAt: Date;         // Auto-generated
  updatedAt: Date;         // Auto-generated
}
```

**Indexes:**
- `{ externalId: 1, sourceUrl: 1 }` - Unique index (prevents duplicates)
- `{ title: 1 }` - For search
- `{ sourceUrl: 1 }` - For filtering by source

### 2. `import_logs` Collection

**Created automatically** when first import is triggered.

**Schema:**
```typescript
{
  fileName: string;        // URL path (e.g., "/?feed=job_feed")
  sourceUrl: string;       // Full API URL
  timestamp: Date;         // Import start time
  total: number;           // Total jobs fetched
  new: number;             // New jobs created
  updated: number;         // Existing jobs updated
  failed: number;          // Failed jobs
  failedReasons: Array<{   // Failure details
    jobId?: string;
    reason: string;
    error?: string;
  }>;
  status: string;          // 'processing' | 'completed' | 'failed'
  processingTime?: number; // Time in milliseconds
  totalBatches: number;     // Total batches
  completedBatches: number; // Completed batches
  createdAt: Date;         // Auto-generated
  updatedAt: Date;         // Auto-generated
}
```

**Indexes:**
- `{ timestamp: -1 }` - For sorting by date (descending)
- `{ sourceUrl: 1 }` - For filtering by source

## Manual MongoDB Commands (Optional)

If you want to verify collections manually using MongoDB shell:

```bash
# Connect to MongoDB
mongosh

# Or if using older mongo client
mongo
```

Then run:

```javascript
// Switch to database
use job_importer

// List collections (will be empty initially)
show collections

// After first import, you'll see:
// jobs
// import_logs

// View jobs collection
db.jobs.find().limit(5)

// View import_logs collection
db.import_logs.find().sort({ timestamp: -1 }).limit(5)

// Count documents
db.jobs.countDocuments()
db.import_logs.countDocuments()
```

## Verification

After running the application and triggering an import:

1. **Check collections exist:**
   ```bash
   mongosh
   use job_importer
   show collections
   ```

2. **Verify indexes:**
   ```javascript
   db.jobs.getIndexes()
   db.import_logs.getIndexes()
   ```

3. **Check data:**
   ```javascript
   db.jobs.countDocuments()
   db.import_logs.find().sort({ timestamp: -1 }).limit(1)
   ```

## Troubleshooting

### Collections Not Created

If collections are not being created:

1. **Check MongoDB connection:**
   - Verify MongoDB is running
   - Check `MONGODB_URI` in `.env` file
   - Test connection: `mongosh "mongodb://localhost:27017/job_importer"`

2. **Check application logs:**
   - Look for MongoDB connection errors
   - Verify the import was triggered successfully

3. **Manually trigger import:**
   ```bash
   curl -X POST http://localhost:3001/api/import/trigger
   ```

### Index Creation Errors

If you get index errors:

1. **Drop existing indexes (if needed):**
   ```javascript
   db.jobs.dropIndexes()
   db.import_logs.dropIndexes()
   ```

2. **Re-run initialization:**
   ```bash
   npm run init-db
   ```

## Summary

✅ **No manual table creation needed** - MongoDB creates collections automatically  
✅ **Indexes are optional** but recommended for performance  
✅ **Just start the app** and collections will be created on first use  
✅ **Run `npm run init-db`** if you want to set up indexes first

