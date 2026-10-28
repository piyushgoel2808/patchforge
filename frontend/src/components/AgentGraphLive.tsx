import React from 'react';
import { Terminal, Cpu, Globe, Brain, Wrench, CheckCircle2, Loader2, FastForward } from 'lucide-react';

interface AgentGraphLiveProps {
  currentNode: string;
  completedNodes: string[];
  status: string;
  telemetryHistory: any[];
  stepTimings?: Record<string, number>;
  confidenceScore?: number;
  skippedNodes?: string[];
}

export const AgentGraphLive: React.FC<AgentGraphLiveProps> = ({
  currentNode,
  completedNodes,
  telemetryHistory,
  stepTimings = {},
  confidenceScore,
  skippedNodes = [],
}) => {
  const getStepDuration = (nodeId: string, tierKey?: string): string | null => {
    if (stepTimings[nodeId] !== undefined) {
      return `${Math.round(stepTimings[nodeId])}ms`;
    }
    if (tierKey) {
      const found = telemetryHistory.find((t) => t.tier === tierKey);
      if (found) return `${Math.round(found.latency_ms)}ms`;
    }
    return null;
  };

  const isVerifyActive = currentNode === 'verify_patch_in_sandbox';
  const isVerifyDone = completedNodes.includes('verify_patch_in_sandbox');

  const steps = [
    {
      id: 'run_initial_tests',
      num: '01',
      title: 'Sandbox Test & Trace',
      subtitle: 'Runs pytest & captures crash hop',
      modelBadge: 'Isolated Subprocess',
      icon: Terminal,
      duration: getStepDuration('run_initial_tests'),
    },
    {
      id: 'triage_with_nano',
      num: '02',
      title: 'Fast AST Triage',
      subtitle: confidenceScore
        ? `Confidence Score: ${(confidenceScore * 100).toFixed(0)}%`
        : 'Identifies broken symbols in <200ms',
      modelBadge: 'Nemotron 3 Nano 30B',
      icon: Cpu,
      duration: getStepDuration('triage_with_nano', 'nano'),
    },
    {
      id: 'ground_with_tavily',
      num: '03',
      title: 'Live Documentation Search',
      subtitle: 'Fetches official migration & CVE guides',
      modelBadge: 'Tavily Search API',
      icon: Globe,
      duration: getStepDuration('ground_with_tavily'),
    },
    {
      id: 'plan_with_ultra',
      num: '04',
      title: 'Blast-Radius Architecture Plan',
      subtitle: 'Preserves downstream data contracts',
      modelBadge: 'Nemotron 3 Ultra 550B',
      icon: Brain,
      duration: getStepDuration('plan_with_ultra', 'ultra'),
    },
    {
      id: 'synthesize_patch_with_super',
      num: '05',
      title: 'Patch Synthesis & Re-Test',
      subtitle: isVerifyDone
        ? '100% unit tests verified green'
        : isVerifyActive
        ? 'Re-running pytest in sandbox...'
        : 'Generates diff & verifies tests',
      modelBadge: 'Nemotron 3 Super 120B',
      icon: Wrench,
      duration:
        getStepDuration('synthesize_patch_with_super', 'super') ||
        getStepDuration('verify_patch_in_sandbox'),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {steps.map((step) => {
        const isCurrent =
          currentNode === step.id ||
          (step.id === 'synthesize_patch_with_super' && isVerifyActive);
        const isDone =
          completedNodes.includes(step.id) &&
          !(step.id === 'synthesize_patch_with_super' && isVerifyActive);
        const isSkipped = skippedNodes.includes(step.id);

        return (
          <div
            key={step.id}
            className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
              isCurrent
                ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40 shadow-lg'
                : isDone
                ? 'border-zinc-800 bg-[#11141f] text-zinc-100'
                : isSkipped
                ? 'border-dashed border-zinc-800/80 bg-[#0b0d14] text-zinc-500'
                : 'border-zinc-800/80 bg-[#0d0f17] text-zinc-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-mono font-bold text-zinc-500">
                  STEP {step.num}
                </span>
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-zinc-950">
                    <Loader2 className="w-3 h-3 animate-spin" /> Running
                  </span>
                ) : isDone ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {step.duration || 'Done'}
                  </span>
                ) : isSkipped ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900 text-zinc-400">
                    <FastForward className="w-3 h-3" /> Bypassed
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-600">Standby</span>
                )}
              </div>

              <div className="text-sm font-semibold text-white">{step.title}</div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {step.subtitle}
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-[11px] font-mono text-emerald-400/90 font-medium">
                {step.modelBadge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
