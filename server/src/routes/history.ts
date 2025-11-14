import { Router, Request, Response } from 'express';
import { HistoryController } from '../controllers/HistoryController';
import { JobService } from '../services/JobService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const routeStartTime = Date.now();
  
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Check and fix stuck imports periodically (every 5th request to catch issues faster)
    if (Math.random() < 0.2) {
      JobService.checkAndFixStuckImports().catch(err => {
      });
    }

    const controllerStartTime = Date.now();
    const result = await HistoryController.getImportHistory(limit, skip);
    const controllerEndTime = Date.now();

    const routeEndTime = Date.now();
    
    res.json(result);
  } catch (error) {
    const routeEndTime = Date.now();
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch import history',
    });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await HistoryController.deleteImportLog(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete import log',
    });
  }
});

router.delete('/', async (req: Request, res: Response) => {
  try {
    const result = await HistoryController.deleteAllImportLogs();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete import logs',
    });
  }
});

export default router;

