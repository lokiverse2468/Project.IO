import cron from 'node-cron';
import { ImportController } from '../controllers/ImportController';

export const startJobFetcherCron = (): void => {
  const cronExpression = process.env.JOB_FETCH_INTERVAL || '0 * * * *';

  console.log(`Starting cron job with expression: ${cronExpression}`);

  cron.schedule(cronExpression, async () => {
    console.log('Running scheduled job import...');
    try {
      await ImportController.triggerImport();
      console.log('Scheduled job import completed');
    } catch (error) {
      console.error('Scheduled job import failed:', error);
    }
  });
};

