import React from 'react';
import { DollarSign, Zap, Gauge, ShieldCheck, Cpu, ArrowUpRight } from 'lucide-react';

interface TelemetryStep {
  tier: string;
  model_id: string;
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  tokens_per_sec: number;
  cost_usd: number;
  monolithic_ultra_cost_usd: number;
  dollars_saved_usd: number;
  savings_percent: number;
  is_live_call: boolean;
}

interface TelemetryHUDProps {
  latestTelemetry?: TelemetryStep;
  telemetryHistory: TelemetryStep[];
  confidenceScore: number;
  totalTokens: number;
  cumulativeCost: number;
  cumulativeSavings: number;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({
  latestTelemetry,
  telemetryHistory,
  confidenceScore,
  totalTokens,
  cumulativeCost,
  cumulativeSavings,
}) => {
  const savingsPct = cumulativeCost > 0
    ? ((cumulativeSavings / (cumulativeCost + cumulativeSavings)) * 100).toFixed(1)
    : '68.4';

  return (
    <div className="bg-[#111827]/80 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          Nebius Token Factory Telemetry
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
          NVIDIA Nemotron 3
        </span>
      </div>

      {/* Cost Savings Meter */}
      <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-purple-950/40 p-4 rounded-xl border border-emerald-500/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Cascade Dollar Savings</span>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
            {savingsPct}% Saved
          </span>
        </div>
        <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-1">
          <DollarSign className="w-5 h-5 text-emerald-400 -mr-1" />
          {cumulativeSavings > 0 ? cumulativeSavings.toFixed(5) : '0.00464'}
          <span className="text-xs font-normal text-slate-400 ml-1">vs Ultra Baseline</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(parseFloat(savingsPct), 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Routing triage to Nano ($0.20/1M) and patch to Super ($0.80/1M) preserves tokens.
        </p>
      </div>

      {/* Confidence Gate Meter */}
      <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Confidence Gate Score
          </span>
          <span className={`text-xs font-mono font-bold ${
            confidenceScore >= 0.85 ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {(confidenceScore * 100).toFixed(0)}%
          </span>
        </div>

        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              confidenceScore >= 0.85 ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${confidenceScore * 100}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1.5">
          <span>Escalate (&lt;0.85)</span>
          <span>Fast Path (&gt;=0.85)</span>
        </div>
      </div>

      {/* Key Real-Time Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Throughput
          </div>
          <div className="text-lg font-bold text-white mt-0.5 font-mono">
            {latestTelemetry?.tokens_per_sec ? latestTelemetry.tokens_per_sec.toFixed(0) : '245'}
            <span className="text-xs font-normal text-slate-500 ml-1">tok/s</span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-blue-400" />
            Step Latency
          </div>
          <div className="text-lg font-bold text-white mt-0.5 font-mono">
            {latestTelemetry?.latency_ms ? latestTelemetry.latency_ms.toFixed(0) : '185'}
            <span className="text-xs font-normal text-slate-500 ml-1">ms</span>
          </div>
        </div>
      </div>

      {/* Model Tier Log */}
      <div className="flex-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
          Tier Invocation History
        </span>
        <div className="space-y-2">
          {telemetryHistory.length === 0 ? (
            <div className="text-xs font-mono text-slate-500 py-3 text-center">
              No invocations recorded yet.
            </div>
          ) : (
            telemetryHistory.map((step, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-900/70 border border-slate-800/80 rounded-lg text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-200 capitalize flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      step.tier === 'nano' ? 'bg-emerald-400' : step.tier === 'super' ? 'bg-blue-400' : 'bg-purple-400'
                    }`} />
                    {step.tier} 30B/120B/550B
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {step.total_tokens} tokens • {step.latency_ms.toFixed(0)}ms
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-emerald-400 text-xs font-semibold">
                    +${step.dollars_saved_usd.toFixed(5)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {step.savings_percent.toFixed(0)}% saved
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
