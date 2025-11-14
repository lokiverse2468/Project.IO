import { JobService } from '../services/JobService';
import { queueService } from '../services/QueueService';

export class HistoryController {
  static async getImportHistory(limit: number, skip: number) {
    const controllerStartTime = Date.now();

    const queryStartTime = Date.now();
    const [history, total] = await Promise.all([
      JobService.getImportHistory(limit, skip),
      JobService.getImportHistoryCount(),
    ]);
    const queryEndTime = Date.now();

    const controllerEndTime = Date.now();

    return {
      data: history,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async deleteImportLog(importLogId: string) {
    await queueService.removeJobsByImportLogId(importLogId);
    const deleted = await JobService.deleteImportLog(importLogId);
    if (!deleted) {
      throw new Error('Import log not found');
    }
    return { message: 'Import log deleted successfully' };
  }

  static async deleteAllImportLogs() {
    await queueService.clearAllJobs();
    const deletedCount = await JobService.deleteAllImportLogs();
    return { 
      message: 'All import logs deleted successfully',
      deletedCount 
    };
  }
}

