import express from 'express';

import { ingestData, ingestHealthMetrics } from '../controllers/ingester';

const router = express.Router();

router.post('/', ingestData);
router.post('/health-metrics', ingestHealthMetrics);

export default router;
