import { Router, Request, Response } from 'express';
import { HistoryController } from '../controllers/HistoryController';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const result = await HistoryController.getImportHistory(limit, skip);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch import history',
    });
  }
});

export default router;

