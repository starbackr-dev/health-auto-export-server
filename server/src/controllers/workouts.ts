/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';

import pool from '../database/postgres';
import { IngestData } from '../models/IngestData';
import { IngestResponse } from '../models/IngestResponse';
import { mapWorkoutData, mapRoute } from '../models/Workout';

export const getWorkouts = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('Indegest workout Data: ', req);
    const fromDate = new Date(Number(startDate));
    const toDate = new Date(Number(endDate));

    console.log(fromDate, toDate);

    const isDate = (date: Date) => !isNaN(date.getTime());

    let query = 'SELECT * FROM workouts';
    const queryParams: (string | Date)[] = [];

    if (isDate(fromDate) && isDate(toDate)) {
      query += ' WHERE start_time BETWEEN $1 AND $2';
      queryParams.push(fromDate, toDate);
    }

    query += ' ORDER BY start_time DESC';

    const result = await pool.query(query, queryParams);
    const workouts = result.rows.map((workout) => {
      return {
        id: workout.workoutid,
        workout_type: workout.name,
        start_time: new Date(workout.start_time).toISOString(),
        end_time: new Date(workout.end_time).toISOString(),
        duration_minutes: workout.duration / 60,
        calories_burned: workout.activeenergyburned?.qty || null,
      };
    });

    console.log(`${workouts.length} workouts fetched`);
    res.status(200).json(workouts);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({ error: 'Error fetching workouts' });
  }
};

export const getWorkout = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('Fetching workout details for ID:', id);
    const workoutResult = await pool.query('SELECT * FROM workouts WHERE workoutid = $1', [id]);
    const workout = workoutResult.rows[0];

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const heartRateData =
      workout.heartratedata?.map((hr: any) => ({
        type: 'Heart Rate',
        timestamp: new Date(hr.date).toISOString(),
        value: hr.Avg,
      })) || [];

    const heartRateRecovery =
      workout.heartraterecovery?.map((hr: any) => ({
        type: 'Heart Rate Recovery',
        timestamp: new Date(hr.date).toISOString(),
        value: hr.Avg,
      })) || [];

    const routeResult = await pool.query('SELECT * FROM routes WHERE workoutid = $1', [id]);
    const route =
      routeResult.rows[0]?.locations.map((x: any) => {
        return {
          latitude: x.latitude,
          longitude: x.longitude,
          time: new Date(x.timestamp).toISOString(),
        };
      }) || [];

    const ret = { heartRateData, heartRateRecovery, route };

    console.log(`Workout ${id} fetched with ${route?.length ?? 0} locations`);
    res.status(200).json(ret);
  } catch (error) {
    console.error('Error fetching workout details:', error);
    res.status(500).json({ error: 'Error fetching workout details' });
  }
};

export const saveWorkouts = async (ingestData: IngestData): Promise<IngestResponse> => {
  try {
    const response: IngestResponse = {};
    const workouts = ingestData.data.workouts;

    if (!workouts || !workouts.length) {
      response.workouts = {
        success: true,
        message: 'No workout data provided',
      };
      return response;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const workout of workouts) {
        const mappedWorkout = mapWorkoutData(workout);
        const {
          workoutId,
          name,
          start,
          end,
          duration,
          activeEnergyBurned,
          heartRateData,
          heartRateRecovery,
        } = mappedWorkout;
        const workoutQuery = `
          INSERT INTO workouts (workoutid, name, start_time, end_time, duration, activeenergyburned, heartratedata, heartraterecovery)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (workoutid)
          DO UPDATE SET
            name = EXCLUDED.name,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            duration = EXCLUDED.duration,
            activeenergyburned = EXCLUDED.activeenergyburned,
            heartratedata = EXCLUDED.heartratedata,
            heartraterecovery = EXCLUDED.heartraterecovery;
        `;
        await client.query(workoutQuery, [
          workoutId,
          name,
          start,
          end,
          duration,
          activeEnergyBurned,
          JSON.stringify(heartRateData || []),
          JSON.stringify(heartRateRecovery || []),
        ]);

        if (workout.route && workout.route.length > 0) {
          const mappedRoute = mapRoute(workout);
          if (mappedRoute) {
            const { workoutId: routeWorkoutId, locations } = mappedRoute;
            const routeQuery = `
              INSERT INTO routes (workoutid, locations)
              VALUES ($1, $2)
              ON CONFLICT (workoutid)
              DO UPDATE SET locations = EXCLUDED.locations;
            `;
            await client.query(routeQuery, [routeWorkoutId, JSON.stringify(locations)]);
          }
        }
      }

      await client.query('COMMIT');

      response.workouts = {
        success: true,
        message: `${workouts.length} Workouts and ${workouts.filter((w) => w.route && w.route.length > 0).length} Routes saved successfully`,
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    console.debug(`Processed ${workouts.length} workouts`);

    return response;
  } catch (error) {
    console.error('Error processing workouts:', error);

    const errorResponse: IngestResponse = {};
    errorResponse.workouts = {
      success: false,
      message: 'Workouts not saved',
      error: error instanceof Error ? error.message : 'An error occurred',
    };

    return errorResponse;
  }
};
