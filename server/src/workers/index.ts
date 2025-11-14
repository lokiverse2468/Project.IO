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
      if (job) {
      }
    });

    worker.on('failed', async (job, err) => {
      if (!job) {
        return;
      }

      const attemptsAllowed = job.opts?.attempts ?? 1;
      const attemptsMade = job.attemptsMade ?? 0;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Let BullMQ retry until the final attempt has been consumed.
      if (attemptsMade < attemptsAllowed) {
        return;
      }

      const data: JobImportData = job.data;

      // Record the failed batch so the dashboard reflects the real status instead of "processing".
      await JobService.updateImportLog(data.importLogId, {
        new: 0,
        updated: 0,
        failed: data.jobs.length,
        failedReasons: [
          {
            reason: 'Batch processing failed',
            error: errorMessage,
          },
        ],
      });

      // Flip the overall import status to failed so it no longer looks stuck in "processing".
      await JobService.markImportLogAsFailed(data.importLogId, errorMessage);
    });

    worker.on('error', (err) => {
    });

    worker.on('ready', () => {
    });

    worker.on('active', (job) => {
      if (job) {
      }
    });

    const port = parseInt(process.env.WORKER_HEALTH_PORT || '3101', 10);
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

