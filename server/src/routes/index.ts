import { Router } from 'express';
import importRoutes from './import';
import historyRoutes from './history';

const router = Router();

router.use('/import', importRoutes);
router.use('/history', historyRoutes);

export default router;

