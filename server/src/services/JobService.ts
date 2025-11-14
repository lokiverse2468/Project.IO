import Job, { IJob } from '../models/Job';
import { BulkWriteResult } from 'mongodb';
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
    const operations = data.jobs.map((jobData) => {
      const updateDoc = {
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        description: jobData.description,
        url: jobData.url,
        category: jobData.category,
        type: jobData.type,
        region: jobData.region,
        externalId: jobData.externalId,
        sourceUrl: data.sourceUrl,
        publishedDate: jobData.publishedDate,
      };

      return {
        updateOne: {
          filter: { externalId: jobData.externalId, sourceUrl: data.sourceUrl },
          update: { $set: updateDoc },
          upsert: true,
        },
      };
    });

    try {
      const bulkResult = await Job.bulkWrite(operations, { ordered: false });
      const newCount = bulkResult.upsertedCount || 0;
      const updatedCount = bulkResult.matchedCount || 0;
      const processed = newCount + updatedCount;
      const failedCount = Math.max(data.jobs.length - processed, 0);

      return {
        new: newCount,
        updated: updatedCount,
        failed: failedCount,
        failedReasons: [],
      };
    } catch (error) {
      const err = error as any;

      if (err?.writeErrors) {
        const bulkResult: BulkWriteResult | undefined = err.result;
        const newCount = bulkResult?.upsertedCount || 0;
        const updatedCount = bulkResult?.matchedCount || 0;

        const failedReasons = err.writeErrors.map((writeErr: any) => ({
          jobId: writeErr?.op?.updateOne?.filter?.externalId,
          reason: 'Bulk write error',
          error: writeErr?.errmsg || writeErr?.code?.toString() || 'Unknown error',
        }));

        const failedCount = failedReasons.length || Math.max(data.jobs.length - (newCount + updatedCount), 0);

        return {
          new: newCount,
          updated: updatedCount,
          failed: failedCount,
          failedReasons,
        };
      }

      throw error;
    }
  }

  static async updateImportLog(
    importLogId: string,
    stats: { new: number; updated: number; failed: number; failedReasons: Array<{ jobId?: string; reason: string; error?: string }> }
  ): Promise<boolean> {
    try {
      const importLog = await ImportLog.findById(importLogId);
      if (!importLog) {
        return false;
      }

      importLog.new += stats.new;
      importLog.updated += stats.updated;
      importLog.failed += stats.failed;
      importLog.failedReasons = importLog.failedReasons.concat(stats.failedReasons);
      await importLog.save();
      return true;
    } catch (error) {
      return false;
    }
  }

  static async finalizeImportLog(importLogId: string): Promise<void> {
    try {
      const importLog = await ImportLog.findById(importLogId);
      if (!importLog) {
        throw new Error(`Import log ${importLogId} not found`);
      }

      // Double-check status before finalizing
      if (importLog.status === 'completed') {
        return;
      }

      importLog.status = 'completed';
      const processingTime = Date.now() - importLog.timestamp.getTime();
      importLog.processingTime = processingTime;
      await importLog.save();
    } catch (error) {
      throw error;
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

  static async createFailedImportLog(sourceUrl: string, errorMessage: string): Promise<IImportLog> {
    const fileName = this.extractFileNameFromUrl(sourceUrl);
    const importLog = new ImportLog({
      fileName,
      sourceUrl,
      total: 0,
      new: 0,
      updated: 0,
      failed: 0,
      failedReasons: [
        {
          reason: 'Import initialization failed',
          error: errorMessage,
        },
      ],
      status: 'failed',
      totalBatches: 0,
      completedBatches: 0,
      processingTime: 0,
    });
    await importLog.save();
    return importLog;
  }

  static async incrementCompletedBatches(importLogId: string): Promise<boolean> {
    try {
      const importLog = await ImportLog.findOneAndUpdate(
        {
          _id: importLogId,
          status: { $nin: ['completed', 'failed'] },
        },
        {
          $inc: { completedBatches: 1 },
        },
        {
          new: true,
        }
      );

      if (!importLog) {
        return false;
      }

      const totalBatches = importLog.totalBatches || 0;
      const completedBatches = importLog.completedBatches || 0;

      if (totalBatches > 0 && completedBatches >= totalBatches) {
        await this.finalizeImportLog(importLogId);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  static async markImportLogAsFailed(importLogId: string, error?: string): Promise<void> {
    try {
      const importLog = await ImportLog.findById(importLogId);
      if (!importLog) {
        throw new Error(`Import log ${importLogId} not found`);
      }

      // Only update if still processing
      if (importLog.status === 'processing') {
        importLog.status = 'failed';
        const processingTime = Date.now() - importLog.timestamp.getTime();
        importLog.processingTime = processingTime;
        
        if (error) {
          importLog.failedReasons.push({
            reason: 'Batch processing failed',
            error: error,
          });
        }
        
        await importLog.save();
      }
    } catch (error) {
    }
  }

  static async updateImportLogBatchCount(importLogId: string, totalBatches: number): Promise<void> {
    try {
      const importLog = await ImportLog.findById(importLogId);
      if (!importLog) {
        throw new Error(`Import log ${importLogId} not found`);
      }

      // Only update if status is still processing
      if (importLog.status !== 'processing') {
        return;
      }

      const currentCompletedBatches = importLog.completedBatches || 0;
      importLog.totalBatches = totalBatches;
      await importLog.save();
      
      // Check if all batches are already completed (race condition handling)
      // Reload to get the latest state
      const updatedImportLog = await ImportLog.findById(importLogId);
      if (updatedImportLog && updatedImportLog.status === 'processing') {
        const completedBatches = updatedImportLog.completedBatches || 0;
        if (totalBatches > 0 && completedBatches >= totalBatches) {
          await this.finalizeImportLog(importLogId);
        }
      }
    } catch (error) {
    }
  }

  static async getImportHistory(limit: number = 50, skip: number = 0) {
    const queryStartTime = Date.now();
    
    // Optimized query with explicit field selection and lean() for faster results
    // Using hint to ensure index usage
    const result = await ImportLog.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean() // Returns plain JavaScript objects instead of Mongoose documents (much faster)
      .select('_id fileName sourceUrl timestamp total new updated failed failedReasons status processingTime totalBatches completedBatches')
      .hint({ timestamp: -1 }); // Force index usage
    
    const queryEndTime = Date.now();
    
    return result;
  }

  static async getImportHistoryCount(): Promise<number> {
    const countStartTime = Date.now();
    
    // Use estimatedDocumentCount for faster results (approximate but much faster)
    // Falls back to countDocuments if collection is small
    let count: number;
    try {
      // Try estimated count first (much faster for large collections)
      const estimatedCount = await ImportLog.estimatedDocumentCount();
      if (estimatedCount < 1000) {
        // For small collections, get exact count
        count = await ImportLog.countDocuments();
      } else {
        count = estimatedCount;
      }
    } catch (error) {
      // Fallback to exact count if estimated fails
      count = await ImportLog.countDocuments();
    }
    
    const countEndTime = Date.now();
    
    return count;
  }

  static async deleteImportLog(importLogId: string): Promise<boolean> {
    try {
      const result = await ImportLog.findByIdAndDelete(importLogId);
      return !!result;
    } catch (error) {
      throw error;
    }
  }

  static async deleteAllImportLogs(): Promise<number> {
    try {
      const result = await ImportLog.deleteMany({});
      return result.deletedCount || 0;
    } catch (error) {
      throw error;
    }
  }

  static async hasProcessingImports(): Promise<boolean> {
    const existing = await ImportLog.exists({ status: 'processing' });
    return !!existing;
  }

  static async hasProcessingImportForSource(sourceUrl: string): Promise<boolean> {
    const existing = await ImportLog.exists({ status: 'processing', sourceUrl });
    return !!existing;
  }

  // Method to check and fix stuck processing statuses
  static async checkAndFixStuckImports(): Promise<void> {
    try {
      const { queueService } = await import('./QueueService');
      const queueStats = await queueService.getQueueStats();
      
      
      // Warn if there are waiting jobs but no active processing (worker might not be running)
      if (queueStats.waiting > 0 && queueStats.active === 0) {
      }

      const stuckImports = await ImportLog.find({
        status: 'processing',
        timestamp: { $lt: new Date(Date.now() - 2 * 60 * 1000) }, // Older than 2 minutes
      });

      for (const importLog of stuckImports) {
        const totalBatches = importLog.totalBatches || 0;
        const completedBatches = importLog.completedBatches || 0;


        // If all batches should be completed, finalize it
        if (totalBatches > 0 && completedBatches >= totalBatches) {
          await this.finalizeImportLog(importLog._id.toString());
        } else if (totalBatches === 0 && completedBatches === 0) {
          // If no batches were created, mark as completed
          await this.finalizeImportLog(importLog._id.toString());
        } else if (completedBatches === 0 && totalBatches > 0) {
          // If no batches have been processed and there are jobs waiting, worker might not be running
          const ageMinutes = Math.floor((Date.now() - importLog.timestamp.getTime()) / 60000);
          if (ageMinutes > 5) {
          }
        }
      }

      if (stuckImports.length > 0) {
      }
    } catch (error) {
    }
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

