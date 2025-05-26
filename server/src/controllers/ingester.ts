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
    // Check if it's the new sleep metrics payload
    console.log(`req: ${JSON.stringify(req.body)}`);

    const healthMetricsData = req.body.data?.metrics;

    if (!healthMetricsData || !Array.isArray(healthMetricsData)) {
      return res.status(400).json({
        error:
          'Invalid data format. Expected an object with a "data" property containing a "metrics" array.',
      });
    }

    for (const metric of healthMetricsData) {
      if (metric.name === 'sleep_analysis' && metric.data && Array.isArray(metric.data)) {
        for (const dataPoint of metric.data) {
          const {
            deep,
            core,
            awake,
            rem,
            source,
            inBed,
            inBedStart,
            inBedEnd,
            sleepStart,
            asleep,
            sleepEnd,
          } = dataPoint;

          type SleepMetric = {
            metricName: string;
            units: string;
            startDate: string;
            endDate: string;
            source: string;
            quantity: number;
            value: number;
          };

          const metricsToInsert: SleepMetric[] = [];

          // Helper to add metrics
          const addMetric = (
            name: string,
            value: number,
            start: string,
            end: string,
            unit: string = 'hours',
          ) => {
            if (value !== undefined && value !== null) {
              metricsToInsert.push({
                metricName: `sleep_${name}`,
                units: unit,
                startDate: start,
                endDate: end,
                source: source,
                quantity: 1,
                value: value,
              });
            }
          };

          addMetric('deep', deep, sleepStart, sleepEnd);
          addMetric('core', core, sleepStart, sleepEnd);
          addMetric('awake', awake, sleepStart, sleepEnd);
          addMetric('rem', rem, sleepStart, sleepEnd);
          addMetric('asleep', asleep, sleepStart, sleepEnd);
          addMetric('inBed', inBed, inBedStart, inBedEnd);

          for (const sleepMetric of metricsToInsert) {
            const query = `
              INSERT INTO health_metrics (metric_name, units, start_date, end_date, source, quantity, value)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            const values = [
              sleepMetric.metricName,
              sleepMetric.units,
              sleepMetric.startDate,
              sleepMetric.endDate,
              sleepMetric.source,
              sleepMetric.quantity,
              sleepMetric.value,
            ];
            await pool.query(query, values);
            console.log(`Values: ${values}`);
          }
        }
      } else {
        // Handle other metric types if necessary, or log a warning
        console.warn(`Unsupported metric type or format: ${metric.name}`);
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
