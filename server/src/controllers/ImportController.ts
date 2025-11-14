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
    const results = await Promise.all(urls.map((url) => this.triggerImportForSource(url)));
    const startedCount = results.filter((result) => result.started).length;

    return {
      started: startedCount > 0,
      message:
        startedCount === 0
          ? 'All imports are already running.'
          : `Scheduled imports for ${startedCount} sources. Processing continues in the background.`,
    };
  }

  static async triggerImportForSource(sourceUrl: string): Promise<{ started: boolean; message: string }> {
    if (await JobService.hasProcessingImportForSource(sourceUrl)) {
      const message = `Import for ${sourceUrl} is already running. Please wait for it to complete.`;
      return { started: false, message };
    }

    const importLog = await JobService.createImportLog(sourceUrl, 0, 0);
    console.log(`[ImportController] Scheduled background import for ${sourceUrl} (log ${importLog._id})`);

    setImmediate(() => {
      this.executeImportForUrl(sourceUrl, importLog._id.toString()).catch(async (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ImportController] Background import failed for ${sourceUrl}: ${errorMessage}`);
        await JobService.markImportLogAsFailed(importLog._id.toString(), errorMessage);
      });
    });

    return { started: true, message: `Import scheduled for ${sourceUrl}` };
  }

  private static async executeImportForUrl(sourceUrl: string, importLogId: string): Promise<void> {
    const overallStart = Date.now();
    console.log(`[ImportController] Import start for ${sourceUrl}`);

    const fetchStart = Date.now();
    const xmlData = await FetchService.fetchJobsFromUrl(sourceUrl);
    console.log(`[ImportController] ${sourceUrl} fetch stage took ${Date.now() - fetchStart}ms`);

    const parseStart = Date.now();
    const jobs = await ParserService.parseXMLToJSON(xmlData);
    console.log(`[ImportController] ${sourceUrl} parsed ${jobs.length} jobs in ${Date.now() - parseStart}ms`);

    if (jobs.length === 0) {
      console.log(`[ImportController] ${sourceUrl} returned 0 jobs. Finalizing log.`);
      await JobService.initializeImportLog(importLogId, 0, 0);
      await JobService.finalizeImportLog(importLogId);
      return;
    }

    const estimatedBatchCount = Math.ceil(jobs.length / parseInt(process.env.BATCH_SIZE || '50'));
    await JobService.initializeImportLog(importLogId, jobs.length, estimatedBatchCount);

    const queueStart = Date.now();
    const actualBatchCount = await queueService.addJobImport({
      sourceUrl,
      jobs,
      importLogId,
    });
    console.log(
      `[ImportController] ${sourceUrl} queued ${actualBatchCount} batches in ${Date.now() - queueStart}ms`
    );

    if (actualBatchCount !== estimatedBatchCount) {
      await JobService.updateImportLogBatchCount(importLogId, actualBatchCount);
    }

    if (actualBatchCount === 0) {
      await JobService.finalizeImportLog(importLogId);
    }

    console.log(`[ImportController] ${sourceUrl} scheduling completed in ${Date.now() - overallStart}ms`);
  }
}

