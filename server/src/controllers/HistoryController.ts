import { JobService } from '../services/JobService';

export class HistoryController {
  static async getImportHistory(limit: number, skip: number) {
    const [history, total] = await Promise.all([
      JobService.getImportHistory(limit, skip),
      JobService.getImportHistoryCount(),
    ]);

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
}

