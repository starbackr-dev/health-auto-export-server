/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';

import pool from '../database/postgres';
import { IngestData } from '../models/IngestData';
import { IngestResponse } from '../models/IngestResponse';
import {
  BaseMetric,
  BloodPressureMetric,
  HeartRateMetric,
  Metric,
  SleepMetric,
  mapMetric,
} from '../models/Metric';
import { MetricName } from '../models/MetricName';

export const getMetrics = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const selectedMetric = req.params.selected_metric;

    if (!selectedMetric) {
      throw new Error('No metric selected');
    }

    const fromDate = new Date(Number(from));
    const toDate = new Date(Number(to));

    const isDate = (date: Date) => !isNaN(date.getTime());

    let query = 'SELECT * FROM metrics WHERE name = $1';
    const queryParams = [selectedMetric];

    if (isDate(fromDate) && isDate(toDate)) {
      query += ' AND date BETWEEN $2 AND $3';
      queryParams.push(fromDate.toISOString(), toDate.toISOString());
    }

    const result = await pool.query(query, queryParams);
    const metrics = result.rows;

    console.log(metrics);
    res.json(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.json({ error: error instanceof Error ? error.message : 'Error getting metrics' });
  }
};

export const saveMetrics = async (ingestData: IngestData): Promise<IngestResponse> => {
  try {
    console.log(JSON.stringify(ingestData));
    const response: IngestResponse = {};
    const metricsData = ingestData.data.metrics;

    if (!metricsData || metricsData.length === 0) {
      response.metrics = {
        success: true,
        error: 'No metrics data provided',
      };
      return response;
    }

    // Group metrics by type and map the data
    const metricsByType = metricsData.reduce(
      (acc, metric) => {
        const mappedMetrics = mapMetric(metric);
        const key = metric.name;
        acc[key] = acc[key] || [];
        acc[key].push(...mappedMetrics);
        return acc;
      },
      {} as {
        [key: string]: Metric[];
      },
    );

    const saveOperations = Object.entries(metricsByType).map(async ([key, metrics]) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const metric of metrics) {
          if (metric.source == null) metric.source = 'source unknown';
          const { source, date, ...data } = metric;
          const query = `
            INSERT INTO metrics (name, source, date, data)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (name, source, date)
            DO UPDATE SET data = EXCLUDED.data;
          `;
          await client.query(query, [key, source, date, data]);
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    });

    await Promise.all(saveOperations);

    response.metrics = {
      success: true,
      message: `${metricsData.length} metrics saved successfully`,
    };

    return response;
  } catch (error) {
    console.error('Error saving metrics:', error);

    const errorResponse: IngestResponse = {};
    errorResponse.metrics = {
      success: false,
      error: error instanceof Error ? error.message : 'Error saving metrics',
    };

    return errorResponse;
  }
};
