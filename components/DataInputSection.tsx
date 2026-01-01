
import React from 'react';
import { GeneratorUnit, LoadDataPoint } from '../types';

interface Props {
  onDataLoaded: (data: LoadDataPoint[]) => void;
  units: GeneratorUnit[];
  setUnits: (units: GeneratorUnit[]) => void;
  horizon: number;
  setHorizon: (val: number) => void;
  lookBack: number;
  setLookBack: (val: number) => void;
}

const DataInputSection: React.FC<Props> = ({ 
  onDataLoaded, units, setUnits, horizon, setHorizon, lookBack, setLookBack 
}) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const parsedData: LoadDataPoint[] = [];

      // Skip header, assuming timestamp,load
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length === 2) {
          const timestamp = parts[0].trim();
          const load = parseFloat(parts[1].trim());
          if (!isNaN(load)) {
            parsedData.push({ timestamp, load });
          }
        }
      }
      onDataLoaded(parsedData);
    };
    reader.readAsText(file);
  };

  const addUnit = () => {
    const id = `Unit-${units.length + 1}`;
    setUnits([...units, { id, name: id, capacity: 200, status: 'OFF' }]);
  };

  const updateUnit = (index: number, capacity: number) => {
    const newUnits = [...units];
    newUnits[index].capacity = capacity;
    setUnits(newUnits);
  };

  const removeUnit = (index: number) => {
    setUnits(units.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 border-b pb-2">System Configuration</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section>
          <label className="block text-sm font-medium text-slate-700 mb-1">Historical Data (CSV)</label>
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-xs text-slate-400">Format: timestamp,load (e.g. 2024-01-01 00:00,120.5)</p>
        </section>

        <section className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Forecast Horizon (Hours)</label>
            <input 
              type="number" 
              value={horizon}
              onChange={(e) => setHorizon(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Look-back Window (Hours)</label>
            <input 
              type="number" 
              value={lookBack}
              onChange={(e) => setLookBack(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </section>
      </div>

      <section>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-slate-700">Generator Units</label>
          <button 
            onClick={addUnit}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
          >
            + Add Unit
          </button>
        </div>
        <div className="space-y-2">
          {units.map((unit, idx) => (
            <div key={unit.id} className="flex items-center gap-2">
              <span className="text-sm font-mono text-slate-500 w-16">{unit.name}</span>
              <input 
                type="number" 
                value={unit.capacity}
                onChange={(e) => updateUnit(idx, parseFloat(e.target.value))}
                placeholder="Capacity (MW)"
                className="flex-1 px-3 py-1 text-sm border rounded-md"
              />
              <button 
                onClick={() => removeUnit(idx)}
                className="text-red-500 hover:text-red-700 px-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DataInputSection;
