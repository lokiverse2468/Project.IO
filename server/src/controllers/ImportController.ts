import { FetchService } from '../services/FetchService';
import { ParserService } from '../services/ParserService';
import { queueService } from '../services/QueueService';
import { JobService } from '../services/JobService';

export class ImportController {
  static async triggerImport(): Promise<void> {
    const urls = FetchService.getJobApiUrls();

    for (const url of urls) {
      await this.triggerImportForUrl(url);
    }
  }

  static async triggerImportForUrl(sourceUrl: string): Promise<void> {
    try {
      console.log(`Fetching jobs from: ${sourceUrl}`);
      
      const xmlData = await FetchService.fetchJobsFromUrl(sourceUrl);
      const jobs = await ParserService.parseXMLToJSON(xmlData);

      if (jobs.length === 0) {
        console.log(`No jobs found for ${sourceUrl}`);
        return;
      }

      console.log(`Parsed ${jobs.length} jobs from ${sourceUrl}`);

      const batchCount = Math.ceil(jobs.length / parseInt(process.env.BATCH_SIZE || '50'));
      const importLog = await JobService.createImportLog(sourceUrl, jobs.length, batchCount);

      await queueService.addJobImport({
        sourceUrl,
        jobs,
        importLogId: importLog._id.toString(),
      });

      console.log(`Queued ${jobs.length} jobs for import from ${sourceUrl}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to import from ${sourceUrl}:`, errorMessage);
      // Don't throw - continue with other URLs
      // throw error;
    }
  }
}

