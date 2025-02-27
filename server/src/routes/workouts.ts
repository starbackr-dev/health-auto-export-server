import express from 'express';

import { getWorkouts, getWorkout, saveWorkouts } from '../controllers/workouts';

const router = express.Router();

router.post('/', saveWorkouts);
router.get('/', getWorkouts);
router.get('/:id', getWorkout);
router.get('/health', (req, res) => {
  res.status(200).send('OK');
});

export default router;
