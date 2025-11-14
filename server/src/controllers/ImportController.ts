import { FetchService } from '../services/FetchService';
import { ParserService } from '../services/ParserService';
import { queueService } from '../services/QueueService';
import { JobService } from '../services/JobService';

export class ImportController {
  static async triggerImport(): Promise<{ started: boolean; message: string }> {
    if (await JobService.hasProcessingImports()) {
      const message = 'An import is already running. Please wait for it to finish before starting another.';
      return { started: false, message };
    }

    const urls = FetchService.getJobApiUrls();

    for (const url of urls) {
      await this.triggerImportForUrl(url);
    }

    return { started: true, message: 'Import triggered successfully! Processing jobs...' };
  }

  static async triggerImportForUrl(sourceUrl: string): Promise<{ started: boolean; message: string }> {
    if (await JobService.hasProcessingImportForSource(sourceUrl)) {
      const message = `Import for ${sourceUrl} is already running. Please wait for it to complete.`;
      return { started: false, message };
    }

    try {
      const xmlData = await FetchService.fetchJobsFromUrl(sourceUrl);
      const jobs = await ParserService.parseXMLToJSON(xmlData);

      if (jobs.length === 0) {
        const emptyLog = await JobService.createImportLog(sourceUrl, 0, 0);
        await JobService.finalizeImportLog(emptyLog._id.toString());
        return { started: true, message: `No jobs found for ${sourceUrl}` };
      }

      // Create import log first with estimated batch count
      const estimatedBatchCount = Math.ceil(jobs.length / parseInt(process.env.BATCH_SIZE || '50'));
      const importLog = await JobService.createImportLog(sourceUrl, jobs.length, estimatedBatchCount);

      // Queue jobs and get actual batch count
      const actualBatchCount = await queueService.addJobImport({
        sourceUrl,
        jobs,
        importLogId: importLog._id.toString(),
      });

      // Update import log with actual batch count if different
      if (actualBatchCount !== estimatedBatchCount) {
        await JobService.updateImportLogBatchCount(importLog._id.toString(), actualBatchCount);
      }

      // If no batches were created (empty jobs array edge case), mark as completed immediately
      if (actualBatchCount === 0) {
        await JobService.finalizeImportLog(importLog._id.toString());
      }

      // Log queue status after queuing
      const queueStats = await queueService.getQueueStats();
      
      if (queueStats.waiting > 0 && queueStats.active === 0) {
        return {
          started: true,
          message: `Import triggered for ${sourceUrl}. Warning: queue has waiting jobs but no active worker.`,
        };
      }

      return { started: true, message: `Import triggered for ${sourceUrl}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await JobService.createFailedImportLog(sourceUrl, errorMessage);
      return { started: false, message: `Failed to import from ${sourceUrl}: ${errorMessage}` };
    }
  }
}

