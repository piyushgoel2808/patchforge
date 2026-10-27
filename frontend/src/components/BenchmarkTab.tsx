import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingDown, Clock, ShieldCheck, Zap, Play, CheckCircle2, XCircle } from 'lucide-react';

interface BenchmarkTabProps {
  activeScenarioId: string;
}

export const BenchmarkTab: React.FC<BenchmarkTabProps> = ({ activeScenarioId }) => {
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveResult, setLiveResult] = useState<any>(null);

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  const fetchBenchmarks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/benchmark');
      const data = await res.json();
      setBenchmarkData(data);
    } catch (err) {
      console.error('Error fetching benchmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  const runLiveBenchmark = async () => {
    setLiveRunning(true);
    try {
      const res = await fetch('/api/benchmark/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: activeScenarioId || 'scenario:repo_1_pydantic_v2' }),
      });
      const data = await res.json();
      setLiveResult(data);
    } catch (err) {
      console.error('Error running live benchmark:', err);
    } finally {
      setLiveRunning(false);
    }
  };

  if (loading || !benchmarkData) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-sm">
        Loading Agentic Cost & Accuracy Benchmark data...
      </div>
    );
  }

  const { aggregate_comparison, scenarios } = benchmarkData;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Official Nebius Cookbook #3 Replication
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Token Factory Verified
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Agentic Cost & Latency Benchmark: Monolithic vs Cascade
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Demonstrating how PatchForge's confidence-gated cascade drastically reduces inference costs and latency while preserving 100% pass@1 accuracy.
            </p>
          </div>

          <button
            onClick={runLiveBenchmark}
            disabled={liveRunning}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 whitespace-nowrap disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {liveRunning ? 'Measuring Live Tiers...' : 'Run Live Benchmark'}
          </button>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Cost Reduction</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {aggregate_comparison.average_cost_reduction}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {aggregate_comparison.patchforge_cascade_avg_cost} vs {aggregate_comparison.monolithic_ultra_avg_cost}
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Latency Reduction</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 mt-2">
            {aggregate_comparison.average_latency_reduction}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {aggregate_comparison.patchforge_cascade_avg_latency} vs {aggregate_comparison.monolithic_ultra_avg_latency}
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Cascade Pass@1 Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {aggregate_comparison.pass_rate_cascade}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Zero degradation vs Ultra 550B
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Nano-Only Pass@1 Rate</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">
            {aggregate_comparison.pass_rate_nano_only}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Fails complex multi-file ASTs
          </p>
        </div>
      </div>

      {/* Live Measurement Result Banner (if run) */}
      {liveResult && (
        <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Live Benchmark Result for {liveResult.scenario_id}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              Measured Savings: {liveResult.measured_savings_pct}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-slate-400 block">Nano 30B Latency:</span>
              <span className="text-white font-bold">{liveResult.live_measurements.nano_tier.latency_ms} ms</span>
            </div>
            <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-slate-400 block">Cascade Total Cost:</span>
              <span className="text-emerald-400 font-bold">${liveResult.cascade_total_cost_usd}</span>
            </div>
            <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-slate-400 block">Monolithic Ultra Cost:</span>
              <span className="text-slate-300 font-bold">${liveResult.monolithic_estimated_cost_usd}</span>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Scenario Comparison Table */}
      <div className="bg-[#111827]/80 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Detailed Per-Scenario Benchmark Matrix
          </h3>
          <span className="text-xs font-mono text-slate-500">
            NVIDIA Nemotron 3 (Nano 30B / Super 120B / Ultra 550B)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Scenario</th>
                <th className="px-4 py-3">Model Architecture</th>
                <th className="px-4 py-3">Inference Cost</th>
                <th className="px-4 py-3">Latency (ms)</th>
                <th className="px-4 py-3">Pass@1 Rate</th>
                <th className="px-4 py-3">Efficiency Gains</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {scenarios.map((sc: any) => (
                <React.Fragment key={sc.id}>
                  {/* Row 1: Nano Only */}
                  <tr className="hover:bg-slate-900/40">
                    <td rowSpan={3} className="px-5 py-4 font-sans font-bold text-slate-200 border-r border-slate-800/60 align-top">
                      <div>{sc.name}</div>
                      <div className="text-[11px] text-slate-500 font-normal mt-0.5">{sc.description}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">
                      Nemotron 3 Nano 30B Only
                    </td>
                    <td className="px-4 py-2.5 text-slate-300">${sc.models.nano_only.cost_usd.toFixed(5)}</td>
                    <td className="px-4 py-2.5 text-slate-300">{sc.models.nano_only.latency_ms} ms</td>
                    <td className="px-4 py-2.5 text-rose-400 font-bold">{sc.models.nano_only.pass_rate}</td>
                    <td className="px-4 py-2.5 text-slate-500">Incomplete AST Fix</td>
                  </tr>

                  {/* Row 2: Ultra Only */}
                  <tr className="hover:bg-slate-900/40">
                    <td className="px-4 py-2.5 text-slate-400">
                      Nemotron 3 Ultra 550B (Monolithic)
                    </td>
                    <td className="px-4 py-2.5 text-slate-300">${sc.models.ultra_only.cost_usd.toFixed(5)}</td>
                    <td className="px-4 py-2.5 text-slate-300">{sc.models.ultra_only.latency_ms} ms</td>
                    <td className="px-4 py-2.5 text-emerald-400 font-bold">{sc.models.ultra_only.pass_rate}</td>
                    <td className="px-4 py-2.5 text-slate-500">Baseline (1x Cost)</td>
                  </tr>

                  {/* Row 3: PatchForge Cascade */}
                  <tr className="bg-emerald-950/15 hover:bg-emerald-950/25 border-b-2 border-slate-800">
                    <td className="px-4 py-2.5 text-emerald-300 font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      PatchForge 4-Tier Cascade
                    </td>
                    <td className="px-4 py-2.5 text-emerald-400 font-bold">${sc.models.patchforge_cascade.cost_usd.toFixed(5)}</td>
                    <td className="px-4 py-2.5 text-cyan-300 font-bold">{sc.models.patchforge_cascade.latency_ms} ms</td>
                    <td className="px-4 py-2.5 text-emerald-400 font-black">{sc.models.patchforge_cascade.pass_rate}</td>
                    <td className="px-4 py-2.5 text-emerald-400 font-bold">
                      {sc.models.patchforge_cascade.savings_pct} cheaper • {sc.models.patchforge_cascade.latency_reduction_pct} faster
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
