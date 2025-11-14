import cron from 'node-cron';
import { ImportController } from '../controllers/ImportController';

export const startJobFetcherCron = (): void => {
  const cronExpression = process.env.JOB_FETCH_INTERVAL || '0 * * * *';


  cron.schedule(cronExpression, async () => {
    try {
      const result = await ImportController.triggerImport();
    } catch (error) {
    }
  });
};

