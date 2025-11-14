import { Worker } from 'bullmq';
import http from 'http';
import dotenv from 'dotenv';
import { connectRedis, getRedisClient } from '../config/redis';
import { connectDatabase } from '../config/database';
import { JobService } from '../services/JobService';
import { JobImportData } from '../services/QueueService';

dotenv.config();

const queueName = process.env.QUEUE_NAME || 'job-import-queue';
const maxConcurrency = parseInt(process.env.MAX_CONCURRENCY || '10');

const startWorker = async () => {
  try {
    // Connect to MongoDB (for JobService)
    await connectDatabase();
    
    // Connect to Redis (for BullMQ)
    await connectRedis();
    
    // Create worker after connections are established
    const worker = new Worker(
      queueName,
      async (job) => {
        const data: JobImportData = job.data;
        const batchStartTime = Date.now();
        
        try {

          const stats = await JobService.processJobBatch(data);
          
          const logUpdated = await JobService.updateImportLog(data.importLogId, stats);
          if (!logUpdated) {
            return stats;
          }

          const isCompleted = await JobService.incrementCompletedBatches(data.importLogId);

          const batchEndTime = Date.now();

          if (isCompleted) {
          }

          return stats;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw error; // Re-throw to let BullMQ handle retries
        }
      },
      {
        connection: getRedisClient(),
        concurrency: maxConcurrency,
        removeOnComplete: {
          age: 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 24 * 3600,
        },
      }
    );

    worker.on('completed', (job) => {
    });

    worker.on('failed', async (job, err) => {
      
      // If job has exhausted all retries, mark the import log appropriately
      if (job && job.attemptsMade >= (job.opts?.attempts || 3)) {
        const data: JobImportData = job.data;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        // Note: We don't mark the entire import as failed here because other batches might succeed
        // Instead, we rely on the batch completion logic to handle it
        // However, we could track failed batches and mark as failed if all batches fail
      }
    });

    worker.on('error', (err) => {
    });

    worker.on('ready', () => {
    });

    worker.on('active', (job) => {
    });

    const port = parseInt(process.env.WORKER_HEALTH_PORT || process.env.PORT || '3101', 10);
    const server = http.createServer((_, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Worker running');
    });

    server.listen(port, () => {
    });
  } catch (error) {
    process.exit(1);
  }
};

startWorker();

