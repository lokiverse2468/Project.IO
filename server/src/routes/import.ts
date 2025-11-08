import { Router, Request, Response } from 'express';
import { ImportController } from '../controllers/ImportController';

const router = Router();

router.post('/trigger', async (req: Request, res: Response) => {
  try {
    await ImportController.triggerImport();
    res.json({ message: 'Import triggered successfully' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to trigger import',
    });
  }
});

router.post('/trigger/:url', async (req: Request, res: Response) => {
  try {
    const url = decodeURIComponent(req.params.url);
    await ImportController.triggerImportForUrl(url);
    res.json({ message: `Import triggered for ${url}` });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to trigger import',
    });
  }
});

export default router;

