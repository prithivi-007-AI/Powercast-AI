
export type HorizonUnit = 'hours' | 'days' | 'years';

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

export interface UpgradeRecommendation {
  additionalUnitsNeeded: number;
  targetTotalCapacity: number;
  reasoning: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface ForecastResult {
  predictions: LoadDataPoint[];
  generationRequirement: number;
  recommendedUnits: string[];
  maintenanceWindows: { start: string; end: string; avgLoad: number }[];
  explanation: string;
  upgradeAdvisory?: UpgradeRecommendation;
}

export interface AppState {
  historicalData: LoadDataPoint[];
  forecastHorizonValue: number;
  forecastHorizonUnit: HorizonUnit;
  lookBackWindow: number; 
  units: GeneratorUnit[];
  isProcessing: boolean;
  results: ForecastResult | null;
}
