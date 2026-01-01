
import React, { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ReferenceLine, Area, ComposedChart
} from 'recharts';
import { LoadDataPoint, ForecastResult, GeneratorUnit } from '../types';

interface Props {
  historicalData: LoadDataPoint[];
  results: ForecastResult | null;
  units: GeneratorUnit[];
}

const Dashboard: React.FC<Props> = ({ historicalData, results, units }) => {
  // Merge historical and predicted data by timestamp to handle overlaps
  const { chartData, discrepancies, avgAccuracy } = useMemo(() => {
    const dataMap = new Map<string, any>();

    // Add historical points
    historicalData.slice(-72).forEach(d => {
      const key = d.timestamp.trim();
      dataMap.set(key, {
        time: key,
        displayTime: key.split(' ')[1] || key,
        actual: d.load,
        smoothed: d.smoothed,
        predicted: null,
        error: null
      });
    });

    // Add / Merge predicted points
    results?.predictions.forEach(p => {
      // Normalize timestamp format (Gemini might return ISO or YYYY-MM-DD HH:mm)
      const rawKey = p.timestamp.replace('T', ' ').substring(0, 16);
      const key = rawKey.trim();
      
      const existing = dataMap.get(key);
      if (existing) {
        existing.predicted = p.predicted;
        if (existing.actual !== null) {
          existing.error = Math.abs(existing.actual - p.predicted);
        }
      } else {
        dataMap.set(key, {
          time: key,
          displayTime: key.split(' ')[1] || key,
          actual: null,
          smoothed: null,
          predicted: p.predicted,
          error: null
        });
      }
    });

    const sortedData = Array.from(dataMap.values()).sort((a, b) => a.time.localeCompare(b.time));
    
    // Calculate accuracy metrics for overlapping segments
    const overlapPoints = sortedData.filter(d => d.actual !== null && d.predicted !== null);
    const disc = overlapPoints.map(d => ({
      time: d.time,
      actual: d.actual,
      predicted: d.predicted,
      error: d.error,
      errorPercent: (d.error / d.actual) * 100
    }));

    const totalErrorPercent = disc.reduce((acc, curr) => acc + curr.errorPercent, 0);
    const accuracy = disc.length > 0 ? 100 - (totalErrorPercent / disc.length) : null;

    return { 
      chartData: sortedData, 
      discrepancies: disc, 
      avgAccuracy: accuracy 
    };
  }, [historicalData, results]);

  const peakLoad = results ? Math.max(...results.predictions.map(p => p.predicted)) : 0;
  const totalAvailableCapacity = units.reduce((acc, u) => acc + u.capacity, 0);

  // Identify "Significant Discrepancies" (e.g., > 5% error)
  const highErrors = discrepancies.filter(d => d.errorPercent > 5);

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peak Predicted Load</p>
          <p className="text-2xl font-black text-slate-800">{peakLoad.toFixed(1)} <span className="text-sm font-normal">MW</span></p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Required Generation</p>
          <p className="text-2xl font-black text-slate-800">{results?.generationRequirement.toFixed(1) || 0} <span className="text-sm font-normal">MW</span></p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-amber-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Forecast Accuracy</p>
          <p className="text-2xl font-black text-slate-800">
            {avgAccuracy !== null ? `${avgAccuracy.toFixed(1)}%` : 'N/A'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">High Discrepancies</p>
          <p className="text-2xl font-black text-slate-800">
            {highErrors.length} <span className="text-sm font-normal">pts &gt; 5%</span>
          </p>
        </div>
      </div>

      {/* Main Load Chart with Overlap Handling */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[450px]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">System Load & Forecast Comparison</h3>
            <p className="text-xs text-slate-400">Comparing historical outcomes with AI predictions in overlapping windows.</p>
          </div>
          {avgAccuracy !== null && (
            <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
              Confidence Score: {avgAccuracy > 95 ? 'High' : avgAccuracy > 85 ? 'Medium' : 'Low'}
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="displayTime" interval="preserveStartEnd" minTickGap={30} />
            <YAxis label={{ value: 'MW', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(value: any, name: string) => [value?.toFixed(1) + " MW", name]}
            />
            <Legend verticalAlign="top" height={36} />
            <Area 
              type="monotone" 
              dataKey="error" 
              fill="#fee2e2" 
              stroke="transparent" 
              name="Abs. Error" 
              legendType="none"
            />
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#94a3b8" 
              strokeWidth={2} 
              dot={false} 
              name="Actual Load" 
            />
            <Line 
              type="monotone" 
              dataKey="smoothed" 
              stroke="#3b82f6" 
              strokeWidth={1} 
              strokeDasharray="3 3"
              dot={false} 
              name="Smoothed Trend" 
            />
            <Line 
              type="monotone" 
              dataKey="predicted" 
              stroke="#ef4444" 
              strokeWidth={3} 
              dot={{ r: 2, fill: '#ef4444' }} 
              name="AI Prediction" 
            />
            {units.map(u => (
               <ReferenceLine key={u.id} y={u.capacity} stroke="#cbd5e1" strokeDasharray="3 3" label={{ position: 'right', value: u.name, fontSize: 8, fill: '#94a3b8' }} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unit Commitment */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Unit Commitment</h3>
          <div className="space-y-3">
            {units.map(unit => {
              const isOn = results?.recommendedUnits.includes(unit.name) || results?.recommendedUnits.includes(unit.id);
              return (
                <div 
                  key={unit.id} 
                  className={`p-3 rounded-lg border flex justify-between items-center ${isOn ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{unit.name}</p>
                    <p className="text-[10px] text-slate-500">{unit.capacity} MW</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${isOn ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                    {isOn ? 'ON' : 'OFF'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Maintenance & Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-bold text-slate-800">Forecast Deviation Analysis</h3>
             <span className="text-[10px] font-bold text-slate-400">SIGNIFICANT EVENTS: {highErrors.length}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              <p className="text-xs font-bold text-slate-500 mb-2">High Discrepancy Log (&gt;5% Error)</p>
              {highErrors.length > 0 ? highErrors.map((e, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-100 text-[10px]">
                  <span className="font-mono">{e.time.split(' ')[1]}</span>
                  <span className="text-red-700 font-bold">Δ {e.errorPercent.toFixed(1)}%</span>
                  <span className="text-slate-400">Act: {e.actual} / Pred: {e.predicted}</span>
                </div>
              )) : (
                <p className="text-[10px] text-slate-400 italic">No significant deviations detected in overlap window.</p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 mb-2">Suggested Action Plan</p>
              {results?.maintenanceWindows.slice(0, 1).map((win, idx) => (
                <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tighter">Maintenance Window Found</p>
                  <p className="text-xs font-black text-amber-900 mt-1">
                    {win.start.split(' ')[1]} - {win.end.split(' ')[1]}
                  </p>
                  <p className="text-[10px] text-amber-700 mt-1">
                    Avg Load: {win.avgLoad.toFixed(1)} MW
                  </p>
                </div>
              ))}
              {results && (
                <div className="p-3 bg-blue-50 text-blue-800 text-[11px] rounded-lg leading-relaxed">
                  <strong>AI Note:</strong> {results.explanation}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
