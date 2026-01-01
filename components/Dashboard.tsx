
import React, { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ReferenceLine, Area, ComposedChart
} from 'recharts';
import { LoadDataPoint, ForecastResult, GeneratorUnit, HorizonUnit } from '../types';

interface Props {
  historicalData: LoadDataPoint[];
  results: ForecastResult | null;
  units: GeneratorUnit[];
  horizonUnit: HorizonUnit;
}

const Dashboard: React.FC<Props> = ({ historicalData, results, units, horizonUnit }) => {
  const { chartData, discrepancies, avgAccuracy, maxLoadValue } = useMemo(() => {
    const dataMap = new Map<string, any>();
    let maxVal = 0;

    historicalData.slice(-100).forEach(d => {
      const key = d.timestamp.trim();
      if (d.load > maxVal) maxVal = d.load;
      dataMap.set(key, { 
        time: key, 
        actual: d.load, 
        smoothed: d.smoothed, 
        predicted: null 
      });
    });

    results?.predictions.forEach(p => {
      const key = p.timestamp.replace('T', ' ').substring(0, 16);
      if (p.predicted > maxVal) maxVal = p.predicted;
      const existing = dataMap.get(key);
      if (existing) {
        existing.predicted = p.predicted;
      } else {
        dataMap.set(key, { 
          time: key, 
          actual: null, 
          smoothed: null, 
          predicted: p.predicted 
        });
      }
    });

    const sorted = Array.from(dataMap.values()).sort((a, b) => a.time.localeCompare(b.time));
    const overlap = sorted.filter(d => d.actual !== null && d.predicted !== null);
    const accuracy = overlap.length > 0 ? 100 - (overlap.reduce((acc, d) => acc + (Math.abs(d.actual - d.predicted) / d.actual), 0) / overlap.length * 100) : null;

    return { chartData: sorted, discrepancies: overlap, avgAccuracy: accuracy, maxLoadValue: maxVal };
  }, [historicalData, results]);

  const currentCapacity = units.reduce((acc, u) => acc + u.capacity, 0);
  const peakPredicted = results ? Math.max(...results.predictions.map(p => p.predicted)) : 0;
  const isDeficit = peakPredicted > currentCapacity;

  // X-Axis tick formatter based on horizon unit
  const xAxisFormatter = (tick: string) => {
    if (!tick) return '';
    const date = new Date(tick.replace(' ', 'T'));
    if (isNaN(date.getTime())) return tick;

    switch (horizonUnit) {
      case 'years':
        return date.getFullYear().toString();
      case 'days':
        return `${date.getMonth() + 1}/${date.getDate()}`;
      default: // hours
        return `${date.getHours()}:00`;
    }
  };

  // Y-Axis unit scaling: Shift to GW if load exceeds 1000 MW
  const useGW = maxLoadValue > 5000;
  const yAxisFormatter = (value: number) => {
    return useGW ? (value / 1000).toFixed(1) : value.toString();
  };
  const unitLabel = useGW ? 'GW' : 'MW';

  return (
    <div className="space-y-6">
      {/* 1. Planning Alerts & Infrastructure Advisory */}
      {results?.upgradeAdvisory && (
        <div className={`p-6 rounded-3xl border-2 flex items-center gap-6 shadow-2xl transition-all ${isDeficit ? 'bg-rose-50 border-rose-200 animate-pulse' : 'bg-indigo-50 border-indigo-200'}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${isDeficit ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'}`}>
            {isDeficit ? '⚠️' : '⚡'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Infrastructure Advisory</h3>
              <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                results.upgradeAdvisory.priority === 'Critical' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'
              }`}>
                {results.upgradeAdvisory.priority} Priority
              </span>
            </div>
            <p className="text-sm font-bold text-slate-600 leading-snug">
              {results.upgradeAdvisory.reasoning}
            </p>
            <div className="mt-3 flex gap-4">
              <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">New Units Req.</p>
                <p className="text-lg font-black text-slate-800">+{results.upgradeAdvisory.additionalUnitsNeeded}</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Expansion</p>
                <p className="text-lg font-black text-indigo-600">{useGW ? (results.upgradeAdvisory.targetTotalCapacity / 1000).toFixed(1) : results.upgradeAdvisory.targetTotalCapacity} {unitLabel}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Enhanced KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Peak Forecast" value={useGW ? (peakPredicted / 1000).toFixed(2) : peakPredicted.toFixed(1)} unit={unitLabel} color="rose" />
        <MetricCard label="Current Capacity" value={useGW ? (currentCapacity / 1000).toFixed(2) : currentCapacity} unit={unitLabel} color="slate" />
        <MetricCard label="Generation Margin" value={useGW ? ((currentCapacity - peakPredicted) / 1000).toFixed(2) : (currentCapacity - peakPredicted).toFixed(1)} unit={unitLabel} color={isDeficit ? 'rose' : 'emerald'} />
        <MetricCard label="Confidence Index" value={avgAccuracy ? `${avgAccuracy.toFixed(1)}%` : 'N/A'} unit="" color="indigo" />
      </div>

      {/* 3. High-Clarity Main Chart */}
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">System Load Dynamics</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scalable {horizonUnit} Analytics • All units in {unitLabel}</p>
          </div>
          <div className="flex flex-wrap gap-4">
             <LegendItem color="#10b981" label="Actual" />
             <LegendItem color="#6366f1" label="Smoothed" dashed />
             <LegendItem color="#f43f5e" label="AI Forecast" weight="3" />
          </div>
        </div>
        <div className="h-[450px] w-full -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f8fafc" />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                fontSize={10} 
                minTickGap={50} 
                tick={{fill: '#94a3b8', fontWeight: 700}}
                tickFormatter={xAxisFormatter}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                fontSize={10} 
                tick={{fill: '#94a3b8', fontWeight: 700}}
                tickFormatter={yAxisFormatter}
              />
              <Tooltip 
                cursor={{stroke: '#f1f5f9', strokeWidth: 2}}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                itemStyle={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}
                labelFormatter={(label) => xAxisFormatter(label as string)}
                formatter={(val: number) => [useGW ? (val / 1000).toFixed(2) + " " + unitLabel : val?.toFixed(1) + " " + unitLabel]}
              />
              <Area type="monotone" dataKey="actual" stroke="none" fill="url(#colorActual)" />
              <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{r: 6, strokeWidth: 0}} />
              <Line type="monotone" dataKey="smoothed" stroke="#6366f1" strokeWidth={1} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="predicted" stroke="#f43f5e" strokeWidth={4} dot={{r: 3, fill: '#f43f5e', strokeWidth: 0}} />
              <ReferenceLine y={currentCapacity} stroke="#cbd5e1" strokeDasharray="8 8" label={{ position: 'right', value: `System Limit (${unitLabel})`, fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Support Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overlap Accuracy Zoom */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-rose-500"></div> Deviation Verification
           </h4>
           <div className="h-[200px]">
             {discrepancies.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={discrepancies}>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      formatter={(val: number) => [useGW ? (val / 1000).toFixed(2) + " " + unitLabel : val?.toFixed(1) + " " + unitLabel]}
                    />
                    <Line type="step" dataKey="actual" stroke="#94a3b8" strokeWidth={2} dot={{r: 2}} />
                    <Line type="monotone" dataKey="predicted" stroke="#f43f5e" strokeWidth={3} dot={{r: 4}} />
                 </LineChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-slate-300 italic text-xs font-bold">Awaiting Forecast Execution...</div>
             )}
           </div>
        </div>

        {/* Logistic Logistics */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Dispatch Control
          </h4>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
            {units.map(u => {
              const active = results?.recommendedUnits.includes(u.name);
              return (
                <div key={u.id} className={`flex justify-between items-center p-3 rounded-2xl border transition-all ${active ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                  <div>
                    <p className="text-xs font-black text-slate-700">{u.name}</p>
                    <p className="text-[10px] font-bold text-slate-400">{useGW ? (u.capacity / 1000).toFixed(2) : u.capacity} {unitLabel}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black ${active ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-500'}`}>
                    {active ? 'ONLINE' : 'STBY'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, unit, color }: any) => {
  const colors: any = {
    rose: 'text-rose-600 bg-rose-50 border-rose-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    slate: 'text-slate-600 bg-slate-50 border-slate-100'
  };
  return (
    <div className={`p-6 rounded-3xl shadow-sm border ${colors[color] || colors.slate}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
      <p className="text-3xl font-black tracking-tight">{value} <span className="text-sm font-bold opacity-40">{unit}</span></p>
    </div>
  );
};

const LegendItem = ({ color, label, dashed, weight }: any) => (
  <div className="flex items-center gap-2">
    <div className={`h-0.5 rounded-full ${dashed ? 'border-t-2 border-dashed' : ''}`} style={{ backgroundColor: dashed ? 'transparent' : color, borderTopColor: dashed ? color : 'transparent', width: weight === '3' ? '24px' : '16px', height: weight === '3' ? '3px' : '2px' }}></div>
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
  </div>
);

export default Dashboard;
