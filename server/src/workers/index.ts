import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { connectRedis, getRedisClient } from '../config/redis';
import { connectDatabase } from '../config/database';
import { JobService } from '../services/JobService';
import { JobImportData } from '../services/QueueService';

dotenv.config();

const queueName = process.env.QUEUE_NAME || 'job-import-queue';
const maxConcurrency = parseInt(process.env.MAX_CONCURRENCY || '5');

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
        
        console.log(`Processing batch of ${data.jobs.length} jobs for ${data.sourceUrl}`);

        const stats = await JobService.processJobBatch(data);
        
        await JobService.updateImportLog(data.importLogId, stats);
        await JobService.incrementCompletedBatches(data.importLogId);

        return stats;
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
      console.log(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    worker.on('error', (err) => {
      console.error('Worker error:', err);
    });
    
    console.log(`Worker started with concurrency: ${maxConcurrency}`);
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
};

startWorker();

