
export interface LoadDataPoint {
  timestamp: string;
  load: number;
  smoothed?: number;
  predicted?: number;
}

export interface GeneratorUnit {
  id: string;
  name: string;
  capacity: number;
  status: 'ON' | 'OFF';
}

export interface ForecastResult {
  predictions: LoadDataPoint[];
  generationRequirement: number;
  recommendedUnits: string[];
  maintenanceWindows: { start: string; end: string; avgLoad: number }[];
  explanation: string;
}

export interface AppState {
  historicalData: LoadDataPoint[];
  forecastHorizon: number; // in hours
  lookBackWindow: number; // in hours
  units: GeneratorUnit[];
  isProcessing: boolean;
  results: ForecastResult | null;
}
