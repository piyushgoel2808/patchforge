import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Clock,
  AlertCircle,
  CheckCircle2,
  Ban,
  Database,
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
  onChangeTraceMode,
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
    }, 1300);
    return () => clearInterval(timer);
  }, [isPlaying, safeIndex, activeTrace.length, onChangeStepIndex]);

  if (!activeTrace || activeTrace.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-[#0d0f17] shadow-xl overflow-hidden">
      {/* Section Header */}
      <div className="px-6 py-4 bg-[#11141f] border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Runtime Memory Time-Travel Debugger
            </span>
          </div>
          <h3 className="text-base font-semibold text-white mt-0.5">
            Inspect Live Variables (`frame.f_locals`) at Every Execution Hop
          </h3>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {isPlaying ? 'Pause Replay' : 'Auto-Replay Hops'}
          </button>

          <div className="inline-flex items-center bg-[#090a0f] border border-zinc-800 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                onChangeTraceMode('broken');
              }}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                traceMode === 'broken'
                  ? 'bg-red-500/20 text-red-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Broken Trace
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                onChangeTraceMode('healed');
              }}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                traceMode === 'healed'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Healed Trace
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 cols: Hop Timeline Cards */}
        <div className="lg:col-span-5 space-y-2.5">
          {activeTrace.map((hop, idx) => {
            const isCurrent = idx === safeIndex;
            const isCrash = hop.status === 'CRASHED';
            const isStarved = hop.status === 'STARVED';
            const isHealedHop = hop.status === 'HEALED_PASS';

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  onChangeStepIndex(idx);
                }}
                className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-[#161b2a] border-cyan-400 text-white shadow-md ring-1 ring-cyan-400/30'
                    : isCrash
                    ? 'bg-red-950/20 border-red-800/50 text-red-200 hover:bg-red-950/30'
                    : isStarved
                    ? 'bg-[#0b0d14] border-dashed border-zinc-800 text-zinc-500'
                    : isHealedHop
                    ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
                    : 'bg-[#11141f] border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isCrash ? (
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  ) : isStarved ? (
                    <Ban className="w-5 h-5 text-amber-400/70 shrink-0" />
                  ) : (
                    <CheckCircle2
                      className={`w-5 h-5 shrink-0 ${
                        isHealedHop ? 'text-emerald-400' : 'text-sky-400'
                      }`}
                    />
                  )}
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">
                      Hop {hop.step}: {hop.node_id.split('::')[0]}
                    </div>
                    <div className="text-xs font-mono text-zinc-400 truncate mt-0.5">
                      {hop.node_id.split('::')[1] || hop.function}()
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold block ${
                      isCrash
                        ? 'bg-red-500/20 text-red-300'
                        : isStarved
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    {hop.event}
                  </span>
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    {hop.timestamp_ms} ms
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right 7 cols: Full JSON Payload & Outcome */}
        {currentHop && (
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            {/* Outcome Box */}
            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed ${
                currentHop.error_detail
                  ? 'bg-red-950/25 border-red-800/60 text-red-200'
                  : 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between font-mono font-bold text-[11px] uppercase mb-1.5">
                <span>
                  Hop {currentHop.step} Execution Result ({currentHop.node_id})
                </span>
                <span>Elapsed: {currentHop.timestamp_ms}ms</span>
              </div>
              <p className="font-mono text-xs">
                {currentHop.error_detail || currentHop.return_preview}
              </p>
            </div>

            {/* JSON Payload Box */}
            <div className="flex-1 rounded-xl border border-zinc-800 bg-[#090a0f] overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 bg-[#11141f] border-b border-zinc-800 flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-semibold flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" />
                  Live Payload Snapshot in Memory (`frame.f_locals`)
                </span>
                <span className="text-zinc-500">{currentHop.file}</span>
              </div>
              <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(currentHop.payload_snapshot, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
