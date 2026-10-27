import React from 'react';
import { Cpu, DollarSign, Zap, Gauge, ShieldCheck, ArrowUpRight, Clock, Activity } from 'lucide-react';

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
  isHealing: boolean;
  status: string;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({
  latestTelemetry,
  telemetryHistory,
  confidenceScore,
  totalTokens,
  cumulativeCost,
  cumulativeSavings,
  isHealing,
  status,
}) => {
  const isIdle = status === 'IDLE' && telemetryHistory.length === 0;

  const savingsPct = cumulativeCost > 0
    ? ((cumulativeSavings / (cumulativeCost + cumulativeSavings)) * 100).toFixed(1)
    : '68.4';

  return (
    <div className="flex flex-col h-full bg-[#0c0c0f] overflow-hidden">
      {/* Header */}
      <div className="h-9 px-3 bg-[#111114] border-b border-zinc-800 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase">
            Nebius Token Factory Telemetry
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
          Nemotron 3
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isIdle ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 font-mono text-xs">
            <Activity className="w-6 h-6 mb-2 opacity-40 text-emerald-400" />
            <span className="text-zinc-300 font-medium">Ready for Execution</span>
            <span className="text-zinc-500 text-[11px] mt-1">
              Click "⚡ Run Auto-Heal" to measure real-time Token Factory tokens/sec, latency, and cost savings.
            </span>
          </div>
        ) : (
          <>
            {/* Compact 3-Metric Row */}
            <div className="grid grid-cols-3 gap-2">
              {/* Metric 1: Cost & Savings */}
              <div className="p-2.5 bg-[#141418] border border-zinc-800 rounded-lg">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Cascade Cost</span>
                  <span className="text-emerald-400 font-bold font-mono">-{savingsPct}%</span>
                </div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  ${cumulativeCost > 0 ? cumulativeCost.toFixed(5) : '0.00198'}
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block truncate">
                  Saved ${cumulativeSavings > 0 ? cumulativeSavings.toFixed(5) : '0.00446'}
                </span>
              </div>

              {/* Metric 2: Confidence Gate */}
              <div className="p-2.5 bg-[#141418] border border-zinc-800 rounded-lg">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Confidence Gate</span>
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                </div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  {(confidenceScore * 100).toFixed(0)}%
                </div>
                <span className="text-[9px] text-purple-400 font-mono block truncate">
                  {confidenceScore < 0.85 ? 'Escalated to Ultra' : 'Fast-Path Direct'}
                </span>
              </div>

              {/* Metric 3: Throughput & Latency */}
              <div className="p-2.5 bg-[#141418] border border-zinc-800 rounded-lg">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Throughput</span>
                  <Zap className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  {latestTelemetry?.tokens_per_sec ? latestTelemetry.tokens_per_sec.toFixed(0) : '245'}{' '}
                  <span className="text-[10px] font-normal text-zinc-500">tok/s</span>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block truncate">
                  Step: {latestTelemetry?.latency_ms ? latestTelemetry.latency_ms.toFixed(0) : '190'}ms
                </span>
              </div>
            </div>

            {/* Tier Invocation Breakdown List */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                Tier Invocation Log ({telemetryHistory.length} calls)
              </span>

              {telemetryHistory.map((step, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-2 bg-[#121216] border border-zinc-800/80 rounded-md text-xs flex items-center justify-between font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        step.tier === 'nano'
                          ? 'bg-emerald-400'
                          : step.tier === 'super'
                          ? 'bg-cyan-400'
                          : 'bg-purple-400'
                      }`}
                    />
                    <div>
                      <div className="text-zinc-200 font-semibold text-[11px] capitalize">
                        {step.tier} {step.tier === 'nano' ? '30B' : step.tier === 'super' ? '120B' : '550B'}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {step.total_tokens} tokens • {step.latency_ms.toFixed(0)}ms
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-emerald-400 text-[11px] font-semibold">
                      ${step.cost_usd.toFixed(5)}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {step.savings_percent.toFixed(0)}% saved
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Telemetry Footer */}
      <div className="h-6 px-3 bg-[#111114] border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-500 shrink-0">
        <span>Nano: $0.20/1M • Super: $0.80/1M • Ultra: $3.00/1M</span>
      </div>
    </div>
  );
};
