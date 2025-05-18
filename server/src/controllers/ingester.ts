import { Request, Response } from 'express';

import { saveMetrics } from './metrics';
import { saveWorkouts } from './workouts';
import pool from '../database/postgres';
import { IngestData } from '../models/IngestData';
import { IngestResponse } from '../models/IngestResponse';

export const ingestData = async (req: Request, res: Response) => {
  let response: IngestResponse = {};

  try {
    const data = req.body as IngestData;
    console.log('Indegest ingester Data: ', ingestData);

    if (!data) {
      throw new Error('No data provided');
    }

    const [metricsResponse, workoutsResponse] = await Promise.all([
      saveMetrics(data),
      saveWorkouts(data),
    ]);

    response = { ...metricsResponse, ...workoutsResponse };

    const hasErrors = Object.values(response).some((r) => !r.success);
    const allFailed = Object.values(response).every((r) => !r.success);

    if (allFailed) {
      res.status(500).json(response);
      return;
    }

    res.status(hasErrors ? 207 : 200).json(response);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

export const ingestHealthMetrics = async (req: Request, res: Response) => {
  try {
    const healthMetricsData = req.body.data?.metrics;

    if (!healthMetricsData || !Array.isArray(healthMetricsData)) {
      return res.status(400).json({
        error:
          'Invalid data format. Expected an object with a "data" property containing a "metrics" array.',
      });
    }

    for (const metric of healthMetricsData) {
      if (metric.data && Array.isArray(metric.data)) {
        for (const dataPoint of metric.data) {
          const { startDate, endDate, source, qty, value } = dataPoint;
          const metricName = metric.name;
          const units = metric.units;

          // Assuming the table is named 'health_metrics'
          const query = `
            INSERT INTO health_metrics (metric_name, units, start_date, end_date, source, quantity, value)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;
          const values = [metricName, units, startDate, endDate, source, qty, value];

          await pool.query(query, values);
        }
      }
    }

    res.status(200).json({ message: 'Health metrics ingested successfully' });
  } catch (error) {
    console.error('Error ingesting health metrics:', error);
    res.status(500).json({
      error: 'Failed to ingest health metrics',
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};
