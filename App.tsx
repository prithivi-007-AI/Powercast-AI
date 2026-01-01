
import React, { useState, useEffect } from 'react';
import { LoadDataPoint, GeneratorUnit, AppState, HorizonUnit } from './types';
import DataInputSection from './components/DataInputSection';
import Dashboard from './components/Dashboard';
import { applySavitzkyGolay } from './services/processing';
import { performAIForecast } from './services/geminiService';

const DEFAULT_UNITS: GeneratorUnit[] = [
  { id: 'U1', name: 'Unit 1', capacity: 300, status: 'OFF' },
  { id: 'U2', name: 'Unit 2', capacity: 250, status: 'OFF' },
  { id: 'U3', name: 'Unit 3', capacity: 200, status: 'OFF' },
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    historicalData: [],
    forecastHorizonValue: 24,
    forecastHorizonUnit: 'hours',
    lookBackWindow: 48,
    units: DEFAULT_UNITS,
    // Fix: Removed 'boolean =' which was causing a syntax error as it's a type, not a value.
    isProcessing: false,
    results: null
  });

  useEffect(() => { generateSampleData(); }, []);

  const generateSampleData = () => {
    const sample: LoadDataPoint[] = [];
    const now = new Date();
    for (let i = 100; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600000);
      const hour = time.getHours();
      const baseLoad = 150 + 80 * Math.sin((hour - 6) * Math.PI / 12);
      sample.push({
        timestamp: time.toISOString().replace('T', ' ').substring(0, 16),
        load: parseFloat((baseLoad + (Math.random() * 15)).toFixed(2))
      });
    }
    const smoothed = applySavitzkyGolay(sample.map(d => d.load));
    setState(prev => ({ ...prev, historicalData: sample.map((d, i) => ({ ...d, smoothed: smoothed[i] })) }));
  };

  const runAnalysis = async () => {
    setState(prev => ({ ...prev, isProcessing: true }));
    try {
      const results = await performAIForecast(
        state.historicalData,
        state.forecastHorizonValue,
        state.forecastHorizonUnit,
        state.lookBackWindow,
        state.units
      );
      setState(prev => ({ ...prev, results, isProcessing: false }));
    } catch (err) {
      alert("Analysis engine error. Check console.");
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 py-4 px-8 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter leading-none text-slate-800">PowerCast <span className="text-indigo-600">Pro</span></h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Smart Infrastructure Analytics</p>
          </div>
        </div>
        <button 
          onClick={runAnalysis}
          disabled={state.isProcessing}
          className={`px-8 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${
            state.isProcessing ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-2xl active:scale-95'
          }`}
        >
          {state.isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
          {state.isProcessing ? 'CALCULATING...' : 'EXECUTE FORECAST'}
        </button>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-10 grid grid-cols-1 xl:grid-cols-4 gap-8">
        <aside className="xl:col-span-1">
          <DataInputSection 
            {...state}
            onDataLoaded={(d) => setState(prev => ({ ...prev, historicalData: d }))}
            setUnits={(u) => setState(prev => ({ ...prev, units: u }))}
            setHorizonValue={(v) => setState(prev => ({ ...prev, forecastHorizonValue: v }))}
            setHorizonUnit={(u) => setState(prev => ({ ...prev, forecastHorizonUnit: u }))}
            setLookBack={(l) => setState(prev => ({ ...prev, lookBackWindow: l }))}
          />
          <div className="mt-6 p-6 rounded-3xl bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-700"></div>
            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">System Engine</h5>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-400">Smoothing</span>
                <span className="text-emerald-400">ACTIVE (SG)</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-400">Inference</span>
                <span className="text-indigo-400">LLM-LSTM HYBRID</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="xl:col-span-3">
          <Dashboard 
            historicalData={state.historicalData} 
            results={state.results}
            units={state.units}
            horizonUnit={state.forecastHorizonUnit}
          />
        </section>
      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default App;
