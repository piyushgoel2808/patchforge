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
    <div className="pf-surface border-b pf-border px-4 py-2.5 shrink-0 relative overflow-hidden transition-colors">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold pf-accent-tint border pf-accent-border">
            <Sparkles className="w-3 h-3 pf-accent-text" />
            ⚡ Universal Multi-System Judge Fast-Track (4 Real-World Architectures)
          </span>
          <span className="text-xs pf-text">
            Select any system to X-Ray its multi-file Data-Flow Graph, inspect the Blast Radius, or trigger 1-Click Autonomous Healing:
          </span>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-1.5 flex-1 lg:w-80">
            <div className="relative flex-1">
              <GitBranch className="w-3.5 h-3.5 pf-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Or paste any public GitHub repo URL..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                disabled={isRunning}
                className="w-full pl-8 pr-2.5 py-1 pf-card border pf-border rounded-lg text-[11px] font-mono pf-text placeholder:pf-muted focus:outline-none pf-accent-border"
              />
            </div>
            <button
              type="submit"
              disabled={!customUrl.trim() || isRunning}
              className="px-2.5 py-1 pf-card hover:opacity-90 disabled:opacity-50 pf-text text-[11px] font-semibold rounded-lg border pf-border transition whitespace-nowrap"
            >
              X-Ray & Heal URL
            </button>
          </form>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 pf-muted hover:pf-text rounded"
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
                  ? 'pf-card border-2 pf-accent-border ring-1 ring-emerald-500/20 shadow-sm'
                  : 'pf-card hover:opacity-95 pf-border'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      sc.color === 'indigo'
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/30'
                        : sc.color === 'emerald'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                        : sc.color === 'cyan'
                        ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {sc.badge}
                  </span>
                  <span className="text-[10px] font-mono pf-muted">
                    {sc.library || sc.target_library}@{sc.target_version}
                  </span>
                </div>

                <h3 className="text-xs font-bold pf-text flex items-center justify-between">
                  <span className="truncate">{sc.name || sc.title}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                </h3>
                <p className="text-[10.5px] pf-muted mt-1 line-clamp-2 leading-snug">
                  {sc.description}
                </p>
              </div>

              <div className="mt-2 pt-2 border-t pf-border flex items-center justify-between gap-2">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20 truncate">
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
                      ? 'pf-accent-bg text-white shadow-sm'
                      : 'pf-surface hover:opacity-80 pf-text border pf-border'
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
