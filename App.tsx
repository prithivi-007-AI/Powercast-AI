
import React, { useState, useEffect } from 'react';
import { LoadDataPoint, GeneratorUnit, AppState, ForecastResult } from './types';
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
    forecastHorizon: 24,
    lookBackWindow: 48,
    units: DEFAULT_UNITS,
    isProcessing: false,
    results: null
  });

  // Load sample data on mount if empty
  useEffect(() => {
    generateSampleData();
  }, []);

  const generateSampleData = () => {
    const sample: LoadDataPoint[] = [];
    const now = new Date();
    for (let i = 100; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600000);
      // Simulate a daily curve with noise
      const hour = time.getHours();
      const baseLoad = 150 + 100 * Math.sin((hour - 6) * Math.PI / 12) + 50 * Math.sin((hour - 12) * Math.PI / 6);
      const noise = (Math.random() - 0.5) * 20;
      sample.push({
        timestamp: time.toISOString().replace('T', ' ').substring(0, 16),
        load: parseFloat((baseLoad + noise).toFixed(2))
      });
    }
    const smoothed = applySavitzkyGolay(sample.map(d => d.load));
    const finalized = sample.map((d, idx) => ({ ...d, smoothed: smoothed[idx] }));
    setState(prev => ({ ...prev, historicalData: finalized }));
  };

  const handleDataLoaded = (data: LoadDataPoint[]) => {
    const smoothedValues = applySavitzkyGolay(data.map(d => d.load));
    const processed = data.map((d, i) => ({ ...d, smoothed: smoothedValues[i] }));
    setState(prev => ({ ...prev, historicalData: processed }));
  };

  const runAnalysis = async () => {
    if (state.historicalData.length === 0) {
      alert("Please upload or generate historical load data first.");
      return;
    }
    setState(prev => ({ ...prev, isProcessing: true }));
    try {
      const results = await performAIForecast(
        state.historicalData,
        state.forecastHorizon,
        state.lookBackWindow,
        state.units
      );
      setState(prev => ({ ...prev, results, isProcessing: false }));
    } catch (err) {
      console.error(err);
      alert("Analysis failed. Please check your API configuration.");
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white py-4 px-6 flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center font-black text-xl italic">P</div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">PowerCast AI</h1>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Load Forecasting & Support</p>
          </div>
        </div>
        <button 
          onClick={runAnalysis}
          disabled={state.isProcessing}
          className={`px-6 py-2 rounded-full font-bold transition-all ${
            state.isProcessing 
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/20'
          }`}
        >
          {state.isProcessing ? 'Analyzing Pipeline...' : 'Run Forecast Analysis'}
        </button>
      </nav>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <aside className="xl:col-span-1 space-y-6">
          <DataInputSection 
            onDataLoaded={handleDataLoaded}
            units={state.units}
            setUnits={(units) => setState(prev => ({ ...prev, units }))}
            horizon={state.forecastHorizon}
            setHorizon={(val) => setState(prev => ({ ...prev, forecastHorizon: val }))}
            lookBack={state.lookBackWindow}
            setLookBack={(val) => setState(prev => ({ ...prev, lookBackWindow: val }))}
          />
          
          <div className="bg-blue-900 text-white p-6 rounded-xl shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-800 rounded-full -mr-16 -mt-16 opacity-50 blur-2xl"></div>
            <h4 className="text-sm font-black mb-2 relative">SYSTEM STATUS</h4>
            <div className="flex items-center gap-2 mb-4 relative">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-emerald-200">AI PIPELINE READY</span>
            </div>
            <ul className="text-[11px] space-y-2 text-blue-100/70 relative">
              <li>• Savitzky-Golay (W11, P2) Active</li>
              <li>• LSTM Multi-Horizon Inference Active</li>
              <li>• Unit Commitment (Rule-Based) Ready</li>
              <li>• Horizon: {state.forecastHorizon} Hours</li>
            </ul>
          </div>
        </aside>

        {/* Main Dashboard Area */}
        <section className="xl:col-span-3">
          <Dashboard 
            historicalData={state.historicalData} 
            results={state.results}
            units={state.units}
          />
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 px-8 text-center text-slate-400 text-xs">
        <p>&copy; 2024 Power Systems Intelligence Hub. All Models and Algorithms for Academic Demonstration only.</p>
        <p className="mt-1">Built with Gemini 3 Pro • Savitzky–Golay • React 18</p>
      </footer>
    </div>
  );
};

export default App;
