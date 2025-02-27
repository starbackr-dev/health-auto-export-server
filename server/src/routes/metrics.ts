import express from 'express';

import { getMetrics } from '../controllers/metrics';

const router = express.Router();

router.get('/:selected_metric', getMetrics);

export default router;
