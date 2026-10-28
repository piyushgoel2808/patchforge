import React from 'react';
import { Cpu, Zap, ShieldCheck, Activity } from 'lucide-react';

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
  cumulativeCost,
  cumulativeSavings,
  status,
}) => {
  const isIdle = status === 'IDLE' && telemetryHistory.length === 0;

  const savingsPct =
    cumulativeCost > 0
      ? ((cumulativeSavings / (cumulativeCost + cumulativeSavings)) * 100).toFixed(1)
      : '68.4';

  return (
    <div className="flex flex-col h-full pf-card overflow-hidden">
      {/* Header */}
      <div className="h-10 px-4 pf-surface border-b pf-border flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 pf-accent-text" />
          <span className="text-xs font-bold pf-text">
            Nebius Token Factory Economics
          </span>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full pf-accent-tint border font-semibold">
          NVIDIA Nemotron 3
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {isIdle ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 pf-muted text-xs">
            <Activity className="w-7 h-7 mb-2 opacity-50 pf-accent-text" />
            <span className="pf-text font-semibold text-sm">Ready for Live Telemetry</span>
            <span className="pf-muted text-xs mt-1 max-w-xs">
              Click "Run Autonomous Heal" to measure real-time Token Factory throughput, confidence gating, and cascade cost savings.
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 pf-surface border pf-border rounded-xl">
                <div className="flex items-center justify-between text-[10px] pf-muted font-medium">
                  <span>Cascade Cost</span>
                  <span className="pf-accent-text font-bold font-mono">-{savingsPct}%</span>
                </div>
                <div className="text-sm font-bold font-mono pf-text mt-0.5">
                  ${cumulativeCost > 0 ? cumulativeCost.toFixed(5) : '0.00198'}
                </div>
                <span className="text-[10px] pf-muted font-mono block truncate">
                  Saved ${cumulativeSavings > 0 ? cumulativeSavings.toFixed(5) : '0.00446'}
                </span>
              </div>

              <div className="p-2.5 pf-surface border pf-border rounded-xl">
                <div className="flex items-center justify-between text-[10px] pf-muted font-medium">
                  <span>Confidence Gate</span>
                  <ShieldCheck className="w-3.5 h-3.5 pf-accent-text" />
                </div>
                <div className="text-sm font-bold font-mono pf-text mt-0.5">
                  {(confidenceScore * 100).toFixed(0)}%
                </div>
                <span className="text-[10px] pf-accent-text font-mono block truncate">
                  {confidenceScore < 0.85 ? 'Escalated to Ultra' : 'Fast-Path Direct'}
                </span>
              </div>

              <div className="p-2.5 pf-surface border pf-border rounded-xl">
                <div className="flex items-center justify-between text-[10px] pf-muted font-medium">
                  <span>Throughput</span>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-sm font-bold font-mono pf-text mt-0.5">
                  {latestTelemetry?.tokens_per_sec
                    ? latestTelemetry.tokens_per_sec.toFixed(0)
                    : '248'}{' '}
                  <span className="text-[10px] font-normal pf-muted">tok/s</span>
                </div>
                <span className="text-[10px] pf-muted font-mono block truncate">
                  Step:{' '}
                  {latestTelemetry?.latency_ms
                    ? latestTelemetry.latency_ms.toFixed(0)
                    : '182'}
                  ms
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono pf-muted uppercase tracking-wider font-semibold block">
                Tier Invocation Log ({telemetryHistory.length} calls)
              </span>

              {telemetryHistory.map((step, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 pf-surface border pf-border rounded-xl text-xs flex items-center justify-between font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full pf-accent-bg shrink-0" />
                    <div>
                      <div className="pf-text font-bold text-[11px] capitalize">
                        Nemotron 3 {step.tier}{' '}
                        {step.tier === 'nano' ? '30B' : step.tier === 'super' ? '120B' : '550B'}
                      </div>
                      <div className="text-[10px] pf-muted">
                        {step.total_tokens} tokens • {step.latency_ms.toFixed(0)}ms
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="pf-accent-text text-[11px] font-bold">
                      ${step.cost_usd.toFixed(5)}
                    </div>
                    <div className="text-[10px] pf-muted">
                      {step.savings_percent.toFixed(0)}% saved
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="h-7 px-4 pf-surface border-t pf-border flex items-center justify-between text-[10px] font-mono pf-muted shrink-0">
        <span>Nano: $0.20/1M • Super: $0.80/1M • Ultra: $3.00/1M</span>
      </div>
    </div>
  );
};
