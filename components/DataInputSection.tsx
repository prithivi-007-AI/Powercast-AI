
import React from 'react';
import { GeneratorUnit, LoadDataPoint, HorizonUnit } from '../types';

interface Props {
  onDataLoaded: (data: LoadDataPoint[]) => void;
  units: GeneratorUnit[];
  setUnits: (units: GeneratorUnit[]) => void;
  horizonValue: number;
  setHorizonValue: (val: number) => void;
  horizonUnit: HorizonUnit;
  setHorizonUnit: (val: HorizonUnit) => void;
  lookBack: number;
  setLookBack: (val: number) => void;
}

const DataInputSection: React.FC<Props> = ({ 
  onDataLoaded, units, setUnits, horizonValue, setHorizonValue, horizonUnit, setHorizonUnit, lookBack, setLookBack 
}) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = (event.target?.result as string).split('\n');
      const parsedData: LoadDataPoint[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length === 2) {
          const load = parseFloat(parts[1]);
          if (!isNaN(load)) parsedData.push({ timestamp: parts[0].trim(), load });
        }
      }
      onDataLoaded(parsedData);
    };
    reader.readAsText(file);
  };

  // Provide appropriate numerical options based on the selected unit
  const getNumericOptions = () => {
    switch (horizonUnit) {
      case 'hours': return [1, 3, 6, 12, 24, 48, 72];
      case 'days': return [1, 3, 5, 7, 14, 30];
      case 'years': return [1, 2, 5, 10, 20];
      default: return [1, 5, 10];
    }
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
      <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
        <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">System Input</h2>
      </div>
      
      <div className="space-y-4">
        <section>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Historical Dataset</label>
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
          />
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Forecast Horizon</label>
            <div className="flex gap-2">
              <select 
                value={horizonValue}
                onChange={(e) => setHorizonValue(parseInt(e.target.value))}
                className="flex-[1.5] px-3 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                {getNumericOptions().map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select 
                value={horizonUnit}
                onChange={(e) => {
                  const newUnit = e.target.value as HorizonUnit;
                  setHorizonUnit(newUnit);
                  // Reset value to first available if current value isn't in new options
                  const opts = newUnit === 'hours' ? [1, 3, 6, 12, 24, 48, 72] : newUnit === 'days' ? [1, 3, 5, 7, 14, 30] : [1, 2, 5, 10, 20];
                  if (!opts.includes(horizonValue)) setHorizonValue(opts[0]);
                }}
                className="flex-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="years">Years</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generation Fleet</label>
            <button 
              onClick={() => setUnits([...units, { id: `U${units.length + 1}`, name: `Unit ${units.length + 1}`, capacity: 200, status: 'OFF' }])}
              className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-lg shadow-lg shadow-indigo-200"
            >
              + Add
            </button>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {units.map((unit, idx) => (
              <div key={unit.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 w-8">{unit.id}</span>
                <input 
                  type="number" 
                  value={unit.capacity}
                  onChange={(e) => {
                    const n = [...units];
                    n[idx].capacity = parseFloat(e.target.value);
                    setUnits(n);
                  }}
                  className="flex-1 bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0"
                />
                <button onClick={() => setUnits(units.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 px-1 font-bold">×</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DataInputSection;
