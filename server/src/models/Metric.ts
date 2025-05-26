import { MetricName } from './MetricName';

export interface MetricData {
  name: string;
  units: string;
  data: Metric[];
}

export interface BaseMetric {
  qty: number;
  units: string;
  date: Date;
  source: string;
  metadata?: Record<string, string>;
}

export interface BloodPressureMetric {
  systolic: number;
  diastolic: number;
  units: string;
  date: Date;
  source: string;
  metadata?: Record<string, string>;
}

export interface HeartRateMetric {
  Min: number;
  Avg: number;
  Max: number;
  units: string;
  date: Date;
  source: string;
  metadata?: Record<string, string>;
}

export interface SleepMetric {
  date: Date;
  inBedStart: Date;
  inBedEnd: Date;
  sleepStart: Date;
  sleepEnd: Date;
  core: number;
  rem: number;
  deep: number;
  awake: number;
  inBed: number;
  units: string;
  source: string;
  metadata?: Record<string, string>;
}

export const mapMetric = (
  metric: MetricData,
): (Metric | BloodPressureMetric | SleepMetric | HeartRateMetric)[] => {
  switch (metric.name) {
    case MetricName.BLOOD_PRESSURE:
      const bpData = metric.data as BloodPressureMetric[];
      return bpData.map((measurement) => ({
        systolic: measurement.systolic,
        diastolic: measurement.diastolic,
        units: metric.units,
        date: isValidDate(measurement.date)
          ? new Date(measurement.date)
          : new Date('1970-01-01T00:00:00Z'), // Provide a default or handle error
        source: measurement.source,
        metadata: measurement.metadata,
      }));
    case MetricName.HEART_RATE:
      const hrData = metric.data as HeartRateMetric[];
      return hrData.map((measurement) => ({
        Min: measurement.Min,
        Avg: measurement.Avg,
        Max: measurement.Max,
        units: metric.units,
        date: isValidDate(measurement.date)
          ? new Date(measurement.date)
          : new Date('1970-01-01T00:00:00Z'), // Provide a default or handle error
        source: measurement.source,
        metadata: measurement.metadata,
      }));
    case MetricName.SLEEP_ANALYSIS:
      const sleepData = metric.data as SleepMetric[];
      return sleepData.map((measurement) => ({
        date: isValidDate(measurement.date)
          ? new Date(measurement.date)
          : new Date('1970-01-01T00:00:00Z'), // Provide a default or handle error
        inBedStart: isValidDate(measurement.inBedStart)
          ? new Date(measurement.inBedStart)
          : new Date('1970-01-01T00:00:00Z'), // Provide a default or handle error
        inBedEnd: isValidDate(measurement.inBedEnd)
          ? new Date(measurement.inBedEnd)
          : new Date('1970-01-01T00:00:00Z'), // Provide a default or handle error
        sleepStart: isValidDate(measurement.sleepStart)
          ? new Date(measurement.sleepStart)
          : new Date('1970-01-01T00:00:00Z'), // Provide a default or handle error
        sleepEnd: isValidDate(measurement.sleepEnd)
          ? new Date(measurement.sleepEnd)
          : new Date('1970-01-01T00:00:00Z'), // Provide a default or handle error
        core: measurement.core,
        rem: measurement.rem,
        deep: measurement.deep,
        awake: measurement.awake,
        inBed: measurement.inBed,
        units: metric.units,
        source: measurement.source,
        metadata: measurement.metadata,
      }));
    default:
      const baseData = metric.data as BaseMetric[];
      return baseData.map((measurement) => ({
        qty: measurement.qty,
        units: metric.units,
        date: isValidDate(measurement.date)
          ? new Date(measurement.date)
          : new Date('1970-01-01T00:00:00Z'), // Provide a default or handle error
        source: measurement.source,
        metadata: measurement.metadata,
      }));
  }
};

const isValidDate = (date: Date): boolean => {
  if (date === null || date === undefined) {
    return false;
  }
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

export type Metric = BaseMetric | BloodPressureMetric | SleepMetric | HeartRateMetric;
