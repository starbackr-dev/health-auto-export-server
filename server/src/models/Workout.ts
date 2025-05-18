interface IQuantityMetric {
  qty: number;
  date: Date;
  units: string;
  source: string;
}

interface IMeasurement {
  qty: number;
  units: string;
  date: Date;
  source: string;
}

interface IHeartRate extends IMeasurement {
  Min: number;
  Avg: number;
  Max: number;
}

interface ILocation {
  latitude: number;
  longitude: number;
  course: number;
  courseAccuracy: number;
  speed: number;
  speedAccuracy: number;
  altitude: number;
  verticalAccuracy: number;
  horizontalAccuracy: number;
  timestamp: Date;
}

interface IRoute {
  workoutId: string;
  locations: ILocation[];
}

export interface WorkoutData {
  id: string;
  name: string;
  start: Date;
  end: Date;
  duration: number;
  // --- Optional fields ---
  distance?: IMeasurement;
  activeEnergyBurned?: IMeasurement;
  activeEnergy?: IQuantityMetric;
  heartRateData?: IHeartRate[];
  heartRateRecovery?: IHeartRate[];
  stepCount?: IQuantityMetric[];
  temperature?: IMeasurement;
  humidity?: IMeasurement;
  intensity?: IMeasurement;
  route?: ILocation[];
}

export function mapWorkoutData(data: WorkoutData) {
  const { id, ...rest } = data;

  rest.start = new Date(rest.start);
  rest.end = new Date(rest.end);

  return {
    workoutId: id,
    ...rest,
  };
}

export function mapRoute(data: WorkoutData): IRoute | undefined {
  if (!data.route || data.route.length === 0) {
    return undefined;
  }

  return {
    workoutId: data.id,
    locations: data.route.map((loc) => ({
      ...loc,
      timestamp: new Date(loc.timestamp),
    })),
  };
}
