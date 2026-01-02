
import React, { useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Area, AreaChart, ReferenceLine
} from 'recharts';
import { LoadDataPoint, ForecastResult, GeneratorUnit, HorizonUnit } from '../types';

interface Props {
  historicalData: LoadDataPoint[];
  results: ForecastResult | null;
  units: GeneratorUnit[];
  horizonUnit: HorizonUnit;
}

const Dashboard: React.FC<Props> = ({ historicalData, results, units, horizonUnit }) => {
  // Merge historical and forecast data for the chart
  const { chartData, maxLoadValue } = useMemo(() => {
    let maxVal = 0;
    const combinedData: any[] = [];

    // 1. Add historical data points
    const historicalTail = historicalData.slice(-72); // Last 3 days if hourly
    historicalTail.forEach(d => {
      const val = Number(d.load) || 0;
      if (val > maxVal) maxVal = val;
      combinedData.push({
        time: d.timestamp,
        actual: val,
        forecast: null,
      });
    });

    // 2. Add prediction data points
    if (results?.predictions && results.predictions.length > 0) {
      results.predictions.forEach((p, idx) => {
        const val = Number(p.predicted) || 0;
        if (val > maxVal) maxVal = val;

        // If this is the first prediction, we "bridge" it from the last historical point
        // to prevent a gap in the line chart.
        if (idx === 0 && combinedData.length > 0) {
           const lastActual = combinedData[combinedData.length - 1];
           lastActual.forecast = lastActual.actual;
        }

        combinedData.push({
          time: p.timestamp,
          actual: null,
          forecast: val,
        });
      });
    }

    return { chartData: combinedData, maxLoadValue: maxVal };
  }, [historicalData, results]);

  const currentCapacity = units.reduce((acc, u) => acc + (Number(u.capacity) || 0), 0);
  const peakForecast = results?.predictions?.length 
    ? Math.max(...results.predictions.map(p => Number(p.predicted) || 0)) 
    : 0;

  const useGW = maxLoadValue > 5000;
  const unitLabel = useGW ? 'GW' : 'MW';

  const formatYAxis = (val: any) => {
    const num = Number(val);
    return useGW ? (num / 1000).toFixed(1) : Math.round(num).toString();
  };

  const formatXAxis = (tick: string) => {
    const date = new Date(tick.replace(' ', 'T'));
    if (isNaN(date.getTime())) return tick;
    if (horizonUnit === 'hours') return `${date.getHours()}:00`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="space-y-6">
      {/* Financial and Operational Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox 
          label="Peak Demand" 
          value={useGW ? (peakForecast / 1000).toFixed(2) : Math.round(peakForecast).toString()} 
          unit={unitLabel}
          color="indigo"
        />
        <MetricBox 
          label="System Cost" 
          value={results ? `₹${(results.projectedCostPerHour / 1000).toFixed(1)}k` : '---'} 
          unit="/hr"
          color="emerald"
        />
        <MetricBox 
          label="Total Fleet" 
          value={useGW ? (currentCapacity / 1000).toFixed(2) : currentCapacity.toString()} 
          unit={unitLabel}
          color="slate"
        />
        <MetricBox 
          label="Op. Efficiency" 
          value={results ? `${Math.round(results.systemEfficiency)}%` : '---'} 
          unit=""
          color="rose"
        />
      </div>

      {/* Main Base Chart Design */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Load Projection Profile</h3>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-slate-300"></div>
              <span className="text-slate-400">Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-indigo-500"></div>
              <span className="text-slate-400">Forecast</span>
            </div>
          </div>
        </div>

        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="time" 
                tickFormatter={formatXAxis}
                axisLine={false}
                tickLine={false}
                fontSize={10}
                minTickGap={40}
                tick={{ fill: '#94a3b8', fontWeight: 600 }}
              />
              <YAxis 
                tickFormatter={formatYAxis}
                axisLine={false}
                tickLine={false}
                fontSize={10}
                tick={{ fill: '#94a3b8', fontWeight: 600 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                formatter={(val: any, name: string) => [`${Number(val).toFixed(1)} ${unitLabel}`, name === 'actual' ? 'Historical' : 'AI Predicted']}
              />
              <Area 
                type="monotone" 
                dataKey="actual" 
                stroke="#94a3b8" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorActual)" 
                connectNulls
              />
              <Area 
                type="monotone" 
                dataKey="forecast" 
                stroke="#6366f1" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorForecast)" 
                connectNulls
              />
              <ReferenceLine 
                y={currentCapacity} 
                stroke="#ef4444" 
                strokeDasharray="5 5" 
                label={{ position: 'top', value: 'Fleet Capacity', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategic Insight */}
      {results?.explanation && (
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-800">
           <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">AI Intelligence Report</h4>
           <p className="text-sm font-medium leading-relaxed text-slate-300">{results.explanation}</p>
        </div>
      )}

      {/* Fleet & Maintenance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommended Dispatch Fleet */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Recommended Dispatch Fleet</h4>
          <div className="flex flex-wrap gap-2">
            {units.map(u => {
              const isRecommended = results?.recommendedUnits.includes(u.name);
              return (
                <div 
                  key={u.id} 
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                    isRecommended 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                  }`}
                >
                  {u.name} • {u.capacity}MW
                </div>
              );
            })}
            {(!results) && <div className="text-xs text-slate-300 italic">Perform analysis to see dispatch recommendations</div>}
          </div>
        </div>

        {/* Maintenance Windows */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">AI Maintenance Strategy</h4>
          <div className="space-y-3">
            {results?.maintenanceWindows && results.maintenanceWindows.length > 0 ? (
              results.maintenanceWindows.map((win, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-700">{win.suggestedUnit}</span>
                    <span className="text-[10px] font-bold text-slate-400">{win.start} — {win.end}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Safety Margin</span>
                      <span className={`text-[11px] font-black ${win.safetyMargin < 10 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {win.safetyMargin.toFixed(1)}%
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                      win.priority === 'Urgent' ? 'bg-rose-100 text-rose-700' : 
                      win.priority === 'Deferred' ? 'bg-amber-100 text-amber-700' : 
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {win.priority}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-300 italic">No maintenance windows identified in current horizon</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricBox = ({ label, value, unit, color }: any) => {
  const themes: any = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    rose: 'bg-rose-50 border-rose-100 text-rose-700',
    slate: 'bg-slate-50 border-slate-100 text-slate-700'
  };
  return (
    <div className={`p-4 rounded-2xl border ${themes[color]}`}>
      <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">{label}</p>
      <p className="text-xl font-black">{value}<span className="text-[10px] font-bold ml-1 opacity-50">{unit}</span></p>
    </div>
  );
};

export default Dashboard;
