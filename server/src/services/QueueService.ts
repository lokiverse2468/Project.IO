import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis';

export interface JobImportData {
  sourceUrl: string;
  jobs: Array<{
    title: string;
    company: string;
    location?: string;
    description?: string;
    url?: string;
    category?: string;
    type?: string;
    region?: string;
    externalId: string;
    publishedDate?: Date;
  }>;
  importLogId: string;
}

export class QueueService {
  private queue: Queue | null = null;

  private getQueue(): Queue {
    if (!this.queue) {
      const queueName = process.env.QUEUE_NAME || 'job-import-queue';
      this.queue = new Queue(queueName, {
        connection: getRedisClient(),
      });
    }
    return this.queue;
  }

  async addJobImport(data: JobImportData): Promise<number> {
    const batchSize = parseInt(process.env.BATCH_SIZE || '50');
    const batches: Array<Promise<any>> = [];
    let batchCount = 0;
    const queue = this.getQueue();
    
    for (let i = 0; i < data.jobs.length; i += batchSize) {
      const batch = data.jobs.slice(i, i + batchSize);
      batches.push(
        queue.add(
          'import-jobs',
          {
            ...data,
            jobs: batch,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        )
      );
      batchCount++;
    }

    await Promise.all(batches);
    return batchCount;
  }

  async getQueueStats() {
    const queue = this.getQueue();
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }
}

export const queueService = new QueueService();

