import React from 'react';
import { Terminal, Cpu, Globe, Brain, Wrench, CheckCircle2, Loader2, ChevronRight, CornerDownRight } from 'lucide-react';

interface StepTelemetry {
  tier: string;
  latency_ms: number;
}

interface AgentGraphLiveProps {
  currentNode: string;
  completedNodes: string[];
  status: string;
  telemetryHistory: any[];
  confidenceScore?: number;
  skippedNodes?: string[];
}

export const AgentGraphLive: React.FC<AgentGraphLiveProps> = ({
  currentNode,
  completedNodes,
  status,
  telemetryHistory,
  confidenceScore,
  skippedNodes = [],
}) => {
  const getLatency = (tierKey: string) => {
    const found = telemetryHistory.find((t) => t.tier === tierKey);
    return found ? `${found.latency_ms.toFixed(0)}ms` : null;
  };

  const steps = [
    {
      id: 'run_initial_tests',
      num: '1',
      title: 'Pytest Sandbox',
      desc: 'Subprocess • Baseline',
      icon: Terminal,
      duration: '450ms',
    },
    {
      id: 'triage_with_nano',
      num: '2',
      title: 'Nano 30B Triage',
      desc: confidenceScore ? `Confidence: ${(confidenceScore * 100).toFixed(0)}%` : 'Nemotron 3 Nano • /no_think',
      icon: Cpu,
      duration: getLatency('nano') || '180ms',
    },
    {
      id: 'ground_with_tavily',
      num: '3',
      title: 'Tavily Grounding',
      desc: 'Live Docs & CVE Search',
      icon: Globe,
      duration: '320ms',
    },
    {
      id: 'plan_with_ultra',
      num: '4',
      title: 'Ultra 550B Planner',
      desc: 'MoE Deep Refactor Plan',
      icon: Brain,
      duration: getLatency('ultra') || '850ms',
    },
    {
      id: 'synthesize_patch_with_super',
      num: '5',
      title: 'Super 120B Verify',
      desc: 'Diff Synthesis & Re-Test',
      icon: Wrench,
      duration: getLatency('super') || '480ms',
    },
  ];

  return (
    <div className="h-14 shrink-0 border-b border-zinc-800 bg-[#0d0d10] px-4 flex items-center justify-between text-xs select-none">
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none flex-1">
        {steps.map((step, idx) => {
          const isCurrent = currentNode === step.id;
          const isDone = completedNodes.includes(step.id);
          const isSkipped = skippedNodes.includes(step.id);
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs whitespace-nowrap ${
                  isCurrent
                    ? 'border-emerald-500/80 bg-emerald-500/10 text-white ring-1 ring-emerald-500/40 shadow-sm'
                    : isDone
                    ? 'border-zinc-800 bg-[#141418] text-zinc-200'
                    : isSkipped
                    ? 'border-dashed border-zinc-800/80 bg-transparent text-zinc-500'
                    : 'border-zinc-800/70 bg-[#111114]/60 text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-emerald-500 text-zinc-950 font-bold'
                      : isDone
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <span className="font-mono text-[10px] font-bold">{step.num}</span>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-semibold">{step.title}</span>
                    {isDone && (
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-emerald-400 border border-zinc-700/60">
                        {step.duration}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono mt-0.5 leading-none">
                    {step.desc}
                  </span>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Stage Status pill */}
      <div className="hidden lg:flex items-center gap-2 pl-4 shrink-0">
        <span className="text-[11px] font-mono text-zinc-400">Status:</span>
        <span
          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${
            status === 'HEALED'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : status === 'FAILED'
              ? 'bg-red-500/10 text-red-400 border-red-500/30'
              : status !== 'IDLE'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800'
          }`}
        >
          {status}
        </span>
      </div>
    </div>
  );
};
