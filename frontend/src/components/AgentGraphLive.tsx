import React from 'react';
import { Terminal, Cpu, Globe, Brain, Wrench, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

interface AgentGraphLiveProps {
  currentNode: string;
  completedNodes: string[];
  status: string;
  triageData?: any;
  ultraData?: any;
}

export const AgentGraphLive: React.FC<AgentGraphLiveProps> = ({
  currentNode,
  completedNodes,
  status,
  triageData,
  ultraData,
}) => {
  const steps = [
    {
      id: 'run_initial_tests',
      label: '1. Pytest Sandbox',
      subtitle: 'Capture Failing Stderr',
      icon: Terminal,
      model: 'Isolated Subprocess',
      color: 'from-amber-500 to-orange-500',
    },
    {
      id: 'triage_with_nano',
      label: '2. Nano 30B Triage',
      subtitle: triageData ? `Confidence: ${(triageData.confidence * 100).toFixed(0)}%` : 'Fast AST Analysis (/no_think)',
      icon: Cpu,
      model: 'NVIDIA Nemotron 3 Nano',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'ground_with_tavily',
      label: '3. Tavily Grounding',
      subtitle: 'Live Changelogs & CVEs',
      icon: Globe,
      model: 'Tavily Search API',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'plan_with_ultra',
      label: '4. Ultra 550B Planner',
      subtitle: 'MoE Architectural Plan',
      icon: Brain,
      model: 'NVIDIA Nemotron 3 Ultra',
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'synthesize_patch_with_super',
      label: '5. Super 120B Patch',
      subtitle: 'Synthesize & Pytest Verify',
      icon: Wrench,
      model: 'Nemotron 3 Super + Sandbox',
      color: 'from-emerald-500 to-green-600',
    },
  ];

  return (
    <div className="bg-[#111827]/70 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Real-Time Agentic Cascade Pipeline (LangGraph State Machine)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">
            Current Stage: <span className="text-emerald-400 font-bold uppercase">{status || 'IDLE'}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {steps.map((step, idx) => {
          const isCurrent = currentNode === step.id;
          const isDone = completedNodes.includes(step.id);
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative flex flex-col">
              <div
                className={`relative rounded-xl p-3 border transition-all duration-300 flex-1 flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-slate-800/90 border-emerald-400/80 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400'
                    : isDone
                    ? 'bg-slate-900/80 border-slate-700/80'
                    : 'bg-slate-950/40 border-slate-900 opacity-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isCurrent
                          ? 'bg-emerald-500 text-slate-950 animate-pulse'
                          : isDone
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isCurrent ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Tier {idx + 1}
                    </span>
                  </div>

                  <h4 className={`text-xs font-bold leading-tight ${isCurrent ? 'text-emerald-400' : isDone ? 'text-white' : 'text-slate-400'}`}>
                    {step.label}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {step.subtitle}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="truncate">{step.model}</span>
                </div>
              </div>

              {/* Connecting arrow for larger screens */}
              {idx < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-700 pointer-events-none">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
