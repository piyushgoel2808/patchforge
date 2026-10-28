import React from 'react';
import { Terminal, Cpu, Globe, Brain, Wrench, CheckCircle2, Loader2, FastForward, ChevronRight } from 'lucide-react';

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
  status,
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
      num: '1',
      title: 'Pytest & Runtime Tracer',
      desc: 'Baseline & Hop Capture',
      icon: Terminal,
      duration: getStepDuration('run_initial_tests'),
    },
    {
      id: 'triage_with_nano',
      num: '2',
      title: 'Nano 30B Triage',
      desc: confidenceScore
        ? `Confidence: ${(confidenceScore * 100).toFixed(0)}% • /no_think`
        : 'Nemotron 3 Nano • /no_think',
      icon: Cpu,
      duration: getStepDuration('triage_with_nano', 'nano'),
    },
    {
      id: 'ground_with_tavily',
      num: '3',
      title: 'Tavily Live Grounding',
      desc: 'Official Docs & CVEs',
      icon: Globe,
      duration: getStepDuration('ground_with_tavily'),
    },
    {
      id: 'plan_with_ultra',
      num: '4',
      title: 'Ultra 550B Planner',
      desc: 'Blast-Radius Safe Plan',
      icon: Brain,
      duration: getStepDuration('plan_with_ultra', 'ultra'),
    },
    {
      id: 'synthesize_patch_with_super',
      num: '5',
      title: 'Super 120B & Verify',
      desc: isVerifyDone
        ? 'Diff Applied • 100% Passed'
        : isVerifyActive
        ? 'Re-Running Pytest...'
        : 'Surgical Diff & Re-Trace',
      icon: Wrench,
      duration:
        getStepDuration('synthesize_patch_with_super', 'super') ||
        getStepDuration('verify_patch_in_sandbox'),
    },
  ];

  return (
    <div className="px-4 py-2 pf-surface border-b pf-border flex items-center justify-between gap-2 text-xs select-none shrink-0">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
        {steps.map((step, idx) => {
          const isCurrent =
            currentNode === step.id ||
            (step.id === 'synthesize_patch_with_super' && isVerifyActive);
          const isDone =
            completedNodes.includes(step.id) &&
            !(step.id === 'synthesize_patch_with_super' && isVerifyActive);
          const isSkipped = skippedNodes.includes(step.id);

          return (
            <React.Fragment key={step.id}>
              <div
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all text-xs whitespace-nowrap ${
                  isCurrent
                    ? 'pf-accent-border pf-card pf-text ring-2 ring-indigo-500/30 shadow-sm'
                    : isDone
                    ? 'pf-card pf-border pf-text'
                    : isSkipped
                    ? 'border-dashed pf-border opacity-55'
                    : 'pf-card pf-border opacity-80'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'pf-accent-bg font-bold'
                      : isDone
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'pf-surface pf-muted'
                  }`}
                >
                  {isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isSkipped ? (
                    <FastForward className="w-3 h-3" />
                  ) : (
                    <span className="font-mono text-[10px] font-bold">{step.num}</span>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-bold pf-text">{step.title}</span>
                    {isDone && step.duration && (
                      <span className="font-mono text-[9.5px] px-1.5 py-0.2 rounded pf-accent-tint border font-semibold">
                        {step.duration}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] pf-muted font-mono mt-0.5 leading-none">
                    {step.desc}
                  </span>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 pf-muted shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Pipeline Status Badge */}
      <div className="hidden xl:flex items-center gap-2 pl-3 shrink-0">
        <span className="text-[11px] font-mono pf-muted">Pipeline:</span>
        <span
          className={`font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
            status === 'HEALED'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
              : status === 'FAILED'
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30'
              : status !== 'IDLE'
              ? 'pf-accent-tint animate-pulse'
              : 'pf-card pf-muted pf-border'
          }`}
        >
          {status === 'HEALED' ? '✅ HEALED & VERIFIED' : status}
        </span>
      </div>
    </div>
  );
};
