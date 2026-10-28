import React, { useState } from 'react';
import { Play, Sparkles, GitBranch, CheckCircle2, X } from 'lucide-react';
import { Scenario } from '../App';

interface JudgeFastTrackProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  isRunning: boolean;
  onSelectScenario: (id: string) => void;
  onStartHealing: (target: string) => void;
  onClose?: () => void;
}

export const JudgeFastTrack: React.FC<JudgeFastTrackProps> = ({
  scenarios,
  activeScenarioId,
  isRunning,
  onSelectScenario,
  onStartHealing,
  onClose,
}) => {
  const [customUrl, setCustomUrl] = useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim() && !isRunning) {
      onStartHealing(customUrl.trim());
    }
  };

  return (
    <div className="bg-[#11131a] border-b border-zinc-800 px-4 py-2.5 shrink-0 relative overflow-hidden">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-3 h-3" />
            ⚡ Universal Multi-System Judge Fast-Track (4 Real-World Architectures)
          </span>
          <span className="text-xs text-zinc-300">
            Select any system to X-Ray its multi-file Data-Flow Graph, inspect the Blast Radius, or trigger 1-Click Autonomous Healing:
          </span>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-1.5 flex-1 lg:w-80">
            <div className="relative flex-1">
              <GitBranch className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Or paste any public GitHub repo URL..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                disabled={isRunning}
                className="w-full pl-8 pr-2.5 py-1 bg-[#09090b] border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={!customUrl.trim() || isRunning}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-[11px] font-semibold rounded-lg border border-zinc-700 transition whitespace-nowrap"
            >
              X-Ray & Heal URL
            </button>
          </form>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded"
              title="Minimize Judge Banner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4 Universal Domain Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {scenarios.map((sc) => {
          const isSelected = activeScenarioId === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => !isRunning && onSelectScenario(sc.id)}
              className={`rounded-xl p-2.5 transition-all cursor-pointer border flex flex-col justify-between ${
                isSelected
                  ? 'bg-zinc-900/90 border-emerald-500/60 ring-1 ring-emerald-500/30'
                  : 'bg-[#0b0b0e] hover:bg-zinc-900/60 border-zinc-800/90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      sc.color === 'indigo'
                        ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                        : sc.color === 'emerald'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : sc.color === 'cyan'
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {sc.badge}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {sc.library || sc.target_library}@{sc.target_version}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="truncate">{sc.name || sc.title}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </h3>
                <p className="text-[10.5px] text-zinc-400 mt-1 line-clamp-2 leading-snug">
                  {sc.description}
                </p>
              </div>

              <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-950/40 text-red-300 border border-red-800/40 truncate">
                  Crash: {sc.target_file}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isRunning) onStartHealing(sc.id);
                  }}
                  disabled={isRunning}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition flex items-center gap-1 shrink-0 ${
                    isSelected
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                  }`}
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  1-Click Heal
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
