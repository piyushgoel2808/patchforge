import React, { useState } from 'react';
import { Play, Sparkles, GitBranch, ShieldAlert, Cpu, Search, CheckCircle2 } from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  library: string;
  target_version: string;
  badge: string;
  color: string;
  description: string;
  failing_tests: string[];
  solution_summary: string;
}

interface JudgeFastTrackProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  isRunning: boolean;
  onSelectScenario: (id: string) => void;
  onStartHealing: (target: string) => void;
}

export const JudgeFastTrack: React.FC<JudgeFastTrackProps> = ({
  scenarios,
  activeScenarioId,
  isRunning,
  onSelectScenario,
  onStartHealing,
}) => {
  const [customUrl, setCustomUrl] = useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim() && !isRunning) {
      onStartHealing(customUrl.trim());
    }
  };

  return (
    <div className="bg-[#111827]/80 backdrop-blur border border-slate-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Judge Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Nebius x NVIDIA Hackathon Judge Mode
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30">
              Nebius Token Factory
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30">
              Tavily Live Grounded
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Instant 1-Click Evaluation Scenarios
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Click any broken repository below to watch PatchForge autonomously triage with Nano 30B, ground with Tavily, refactor with Ultra 550B, synthesize with Super 120B, and turn tests 100% green.
          </p>
        </div>

        {/* Custom Repo Clone Form */}
        <form onSubmit={handleCustomSubmit} className="w-full lg:w-auto flex items-center gap-2">
          <div className="relative flex-1 lg:w-80">
            <GitBranch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Or enter public GitHub repository URL..."
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              disabled={isRunning}
              className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={!customUrl.trim() || isRunning}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Heal Repo
          </button>
        </form>
      </div>

      {/* 3 Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {scenarios.map((sc) => {
          const isSelected = activeScenarioId === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => !isRunning && onSelectScenario(sc.id)}
              className={`group relative rounded-xl p-4 transition-all cursor-pointer border text-left flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                  : 'bg-slate-900/50 hover:bg-slate-900/80 border-slate-800 hover:border-slate-700'
              } ${isRunning ? 'cursor-not-allowed opacity-80' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                      sc.color === 'indigo'
                        ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                        : sc.color === 'emerald'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {sc.badge}
                  </span>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {sc.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {sc.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-1">
                  {sc.failing_tests.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-800/40"
                    >
                      FAILED: {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">
                  Target: {sc.library} @ {sc.target_version}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isRunning) onStartHealing(sc.id);
                  }}
                  disabled={isRunning}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow ${
                    isSelected
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  {isRunning && isSelected ? 'Healing...' : 'Run Auto-Heal'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
