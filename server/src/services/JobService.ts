import Job, { IJob } from '../models/Job';
import ImportLog, { IImportLog } from '../models/ImportLog';
import { JobImportData } from './QueueService';

export class JobService {
  static async createOrUpdateJob(
    jobData: {
      title: string;
      company: string;
      location?: string;
      description?: string;
      url?: string;
      category?: string;
      type?: string;
      region?: string;
      externalId: string;
      sourceUrl: string;
      publishedDate?: Date;
    }
  ): Promise<{ isNew: boolean; job: IJob }> {
    try {
      const existingJob = await Job.findOne({
        externalId: jobData.externalId,
        sourceUrl: jobData.sourceUrl,
      });

      if (existingJob) {
        existingJob.title = jobData.title;
        existingJob.company = jobData.company;
        existingJob.location = jobData.location;
        existingJob.description = jobData.description;
        existingJob.url = jobData.url;
        existingJob.category = jobData.category;
        existingJob.type = jobData.type;
        existingJob.region = jobData.region;
        existingJob.publishedDate = jobData.publishedDate;
        await existingJob.save();

        return { isNew: false, job: existingJob };
      } else {
        const newJob = new Job(jobData);
        await newJob.save();
        return { isNew: true, job: newJob };
      }
    } catch (error) {
      throw error;
    }
  }

  static async processJobBatch(
    data: JobImportData
  ): Promise<{ new: number; updated: number; failed: number; failedReasons: Array<{ jobId?: string; reason: string; error?: string }> }> {
    const result = {
      new: 0,
      updated: 0,
      failed: 0,
      failedReasons: [] as Array<{ jobId?: string; reason: string; error?: string }>,
    };

    for (const jobData of data.jobs) {
      try {
        const { isNew } = await this.createOrUpdateJob({
          ...jobData,
          sourceUrl: data.sourceUrl,
        });

        if (isNew) {
          result.new++;
        } else {
          result.updated++;
        }
      } catch (error) {
        result.failed++;
        result.failedReasons.push({
          jobId: jobData.externalId,
          reason: 'Database error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  static async updateImportLog(
    importLogId: string,
    stats: { new: number; updated: number; failed: number; failedReasons: Array<{ jobId?: string; reason: string; error?: string }> }
  ): Promise<void> {
    try {
      const importLog = await ImportLog.findById(importLogId);
      if (!importLog) {
        throw new Error(`Import log ${importLogId} not found`);
      }

      importLog.new += stats.new;
      importLog.updated += stats.updated;
      importLog.failed += stats.failed;
      importLog.failedReasons = importLog.failedReasons.concat(stats.failedReasons);
      await importLog.save();
    } catch (error) {
      console.error('Failed to update import log:', error);
    }
  }

  static async finalizeImportLog(importLogId: string): Promise<void> {
    try {
      const importLog = await ImportLog.findById(importLogId);
      if (!importLog) {
        throw new Error(`Import log ${importLogId} not found`);
      }

      importLog.status = 'completed';
      const processingTime = Date.now() - importLog.timestamp.getTime();
      importLog.processingTime = processingTime;
      await importLog.save();
    } catch (error) {
      console.error('Failed to finalize import log:', error);
    }
  }

  static async createImportLog(sourceUrl: string, total: number, totalBatches: number = 0): Promise<IImportLog> {
    const fileName = this.extractFileNameFromUrl(sourceUrl);
    const importLog = new ImportLog({
      fileName,
      sourceUrl,
      total,
      new: 0,
      updated: 0,
      failed: 0,
      failedReasons: [],
      status: 'processing',
      totalBatches,
      completedBatches: 0,
    });
    await importLog.save();
    return importLog;
  }

  static async incrementCompletedBatches(importLogId: string): Promise<boolean> {
    try {
      const importLog = await ImportLog.findById(importLogId);
      if (!importLog) {
        return false;
      }

      importLog.completedBatches = (importLog.completedBatches || 0) + 1;
      await importLog.save();

      if (importLog.totalBatches && importLog.completedBatches >= importLog.totalBatches) {
        await this.finalizeImportLog(importLogId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to increment completed batches:', error);
      return false;
    }
  }

  static async getImportHistory(limit: number = 50, skip: number = 0) {
    return ImportLog.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  static async getImportHistoryCount(): Promise<number> {
    return ImportLog.countDocuments();
  }

  private static extractFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search;
    } catch {
      return url;
    }
  }
}

