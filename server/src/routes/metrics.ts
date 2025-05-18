import express from 'express';

import { getMetrics, saveMetrics } from '../controllers/metrics';

const router = express.Router();

router.post('/', saveMetrics);
router.get('/:selected_metric', getMetrics);

export default router;
