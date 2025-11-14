import { Job, JobType, Queue } from 'bullmq';
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
    const batchSize = this.getBatchSizeForSource(data.sourceUrl);
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

  private getBatchSizeForSource(sourceUrl: string): number {
    const defaultBatchSize = parseInt(process.env.BATCH_SIZE || '100');
    const largeFeedBatchSize = parseInt(process.env.LARGE_FEED_BATCH_SIZE || '400');

    if (sourceUrl.includes('higheredjobs.com')) {
      return largeFeedBatchSize;
    }

    return defaultBatchSize;
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

  async removeJobsByImportLogId(importLogId: string): Promise<number> {
    const queue = this.getQueue();
    const statuses: JobType[] = ['waiting', 'delayed', 'paused', 'active', 'completed', 'failed'];
    let removed = 0;

    const jobs = await queue.getJobs(statuses, 0, -1, false);

    for (const job of jobs) {
      if (job?.data?.importLogId === importLogId) {
        try {
          await job.remove();
          removed++;
        } catch (error) {
        }
      }
    }

    if (removed > 0) {
    }

    return removed;
  }

  async clearAllJobs(): Promise<void> {
    const queue = this.getQueue();

    await queue.drain(true);
    await Promise.all([
      queue.clean(0, 0, 'completed'),
      queue.clean(0, 0, 'failed'),
      queue.clean(0, 0, 'waiting'),
      queue.clean(0, 0, 'delayed'),
    ]);

  }
}

export const queueService = new QueueService();

