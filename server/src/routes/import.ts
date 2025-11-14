import { Router, Request, Response } from 'express';
import { ImportController } from '../controllers/ImportController';

const router = Router();

router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const result = await ImportController.triggerImport();
    res.json({ message: result.message, started: result.started });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to trigger import',
    });
  }
});

router.post('/trigger/:url', async (req: Request, res: Response) => {
  try {
    const url = decodeURIComponent(req.params.url);
    const result = await ImportController.triggerImportForUrl(url);
    res.json({ message: result.message, started: result.started });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to trigger import',
    });
  }
});

export default router;

