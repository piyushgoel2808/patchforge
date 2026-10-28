import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Clock,
  AlertOctagon,
  CheckCircle2,
  Ban,
  Database,
  ArrowRight,
} from 'lucide-react';

export interface TraceHop {
  step: number;
  timestamp_ms: number;
  node_id: string;
  file?: string;
  function?: string;
  event: 'CALL' | 'RETURN' | 'EXCEPTION' | 'STARVED';
  payload_snapshot: Record<string, any>;
  return_preview?: string;
  error_detail?: string;
  status: 'PASSED' | 'CRASHED' | 'STARVED' | 'HEALED_PASS';
}

interface PayloadReplaySliderProps {
  brokenTrace: TraceHop[];
  healedTrace: TraceHop[];
  traceMode: 'broken' | 'healed';
  onChangeTraceMode: (mode: 'broken' | 'healed') => void;
  activeStepIndex: number;
  onChangeStepIndex: (idx: number) => void;
  canShowHealed: boolean;
}

export const PayloadReplaySlider: React.FC<PayloadReplaySliderProps> = ({
  brokenTrace,
  healedTrace,
  traceMode,
  activeStepIndex,
  onChangeStepIndex,
  canShowHealed,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const activeTrace =
    traceMode === 'healed' && canShowHealed && healedTrace.length > 0
      ? healedTrace
      : brokenTrace;

  const safeIndex = Math.min(
    Math.max(activeStepIndex, 0),
    Math.max(activeTrace.length - 1, 0)
  );
  const currentHop = activeTrace[safeIndex];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      onChangeStepIndex((safeIndex + 1) % Math.max(activeTrace.length, 1));
    }, 1200);
    return () => clearInterval(timer);
  }, [isPlaying, safeIndex, activeTrace.length, onChangeStepIndex]);

  if (!activeTrace || activeTrace.length === 0) {
    return (
      <div className="p-4 text-xs font-mono text-zinc-500 bg-[#0c0c0f]">
        Loading runtime payload execution trace...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0b0b0e] border-t border-zinc-800 select-none overflow-hidden">
      {/* Compact Header */}
      <div className="h-9 px-4 bg-[#111115] border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
            Step-by-Step Payload Memory Inspector (`sys.settrace`)
          </span>
          <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">
            — Click any hop below to inspect the live variables in memory at that exact millisecond
          </span>
        </div>

        <button
          onClick={() => setIsPlaying((p) => !p)}
          className="px-3 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold flex items-center gap-1.5 transition"
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
          {isPlaying ? 'Pause Replay' : 'Auto-Replay Hops'}
        </button>
      </div>

      {/* Main Side-by-Side Body: Left (4 Hop Cards) | Right (Full-Height JSON & Outcome) */}
      <div className="flex-1 min-h-0 grid grid-cols-12 divide-x divide-zinc-800 overflow-hidden">
        {/* Left 5 cols: Vertical / Grid Hop Selector */}
        <div className="col-span-5 p-2.5 overflow-y-auto space-y-1.5 bg-[#0d0d11]">
          {activeTrace.map((hop, idx) => {
            const isCurrent = idx === safeIndex;
            const isCrash = hop.status === 'CRASHED';
            const isStarved = hop.status === 'STARVED';
            const isHealedHop = hop.status === 'HEALED_PASS';

            return (
              <button
                key={idx}
                onClick={() => {
                  setIsPlaying(false);
                  onChangeStepIndex(idx);
                }}
                className={`w-full px-3 py-2 rounded-lg border text-left font-mono text-xs transition flex items-center justify-between gap-2 ${
                  isCurrent
                    ? 'bg-zinc-800/95 border-cyan-400 text-white shadow-sm'
                    : isCrash
                    ? 'bg-red-950/20 border-red-800/50 text-red-300 hover:bg-red-950/35'
                    : isStarved
                    ? 'bg-zinc-900/40 border-dashed border-zinc-800 text-zinc-500'
                    : isHealedHop
                    ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300'
                    : 'bg-[#121217] border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isCrash ? (
                    <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                  ) : isStarved ? (
                    <Ban className="w-4 h-4 text-amber-400/70 shrink-0" />
                  ) : (
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        isHealedHop ? 'text-emerald-400' : 'text-sky-400'
                      }`}
                    />
                  )}
                  <div className="truncate">
                    <div className="font-bold text-[11px] truncate">
                      Hop {hop.step}: {hop.node_id.split('::')[0]}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      fn: {hop.node_id.split('::')[1] || hop.function}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold block ${
                      isCrash
                        ? 'bg-red-500/20 text-red-300'
                        : isStarved
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    {hop.event}
                  </span>
                  <span className="text-[9px] text-zinc-500 mt-0.5 block">
                    @{hop.timestamp_ms}ms
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right 7 cols: Spacious Live Memory JSON Payload + Transition Outcome */}
        {currentHop && (
          <div className="col-span-7 p-3 overflow-y-auto bg-[#08080b] space-y-2.5 font-mono select-text">
            {/* Outcome Banner at Top */}
            <div
              className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
                currentHop.error_detail
                  ? 'bg-red-950/30 border-red-800/60 text-red-200'
                  : 'bg-emerald-950/25 border-emerald-800/50 text-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[10px] uppercase mb-1">
                <span>
                  Hop {currentHop.step} Outcome ({currentHop.node_id})
                </span>
                <span>@{currentHop.timestamp_ms}ms</span>
              </div>
              {currentHop.error_detail || currentHop.return_preview}
            </div>

            {/* Live Variable State JSON */}
            <div className="rounded-lg border border-zinc-800 bg-[#0d0d12] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#121218] border-b border-zinc-800 flex items-center justify-between text-[10px] text-cyan-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3 h-3" />
                  LIVE VARIABLES IN MEMORY (`frame.f_locals`)
                </span>
                <span className="text-zinc-500">{currentHop.file}</span>
              </div>
              <pre className="p-3 text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(currentHop.payload_snapshot, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
