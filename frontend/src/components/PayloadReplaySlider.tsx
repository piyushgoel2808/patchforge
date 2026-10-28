import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  AlertOctagon,
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

  const safeIndex = Math.min(Math.max(activeStepIndex, 0), Math.max(activeTrace.length - 1, 0));
  const currentHop = activeTrace[safeIndex];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      onChangeStepIndex((safeIndex + 1) % Math.max(activeTrace.length, 1));
    }, 1100);
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
      {/* Top Timeline Scrubber Controls */}
      <div className="h-10 px-3 bg-[#111114] border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
            Time-Travel Payload Debugger (sys.settrace)
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsPlaying(false);
              onChangeStepIndex(Math.max(0, safeIndex - 1));
            }}
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
            title="Previous Hop"
          >
            <SkipBack className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center gap-1"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            {isPlaying ? 'Pause' : 'Replay Hops'}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              onChangeStepIndex(Math.min(activeTrace.length - 1, safeIndex + 1));
            }}
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
            title="Next Hop"
          >
            <SkipForward className="w-3 h-3" />
          </button>
        </div>

        {/* Before vs. After Trace Toggle */}
        <div className="flex items-center bg-[#09090b] border border-zinc-800 rounded p-0.5 text-[10px] font-mono">
          <button
            onClick={() => {
              setIsPlaying(false);
              onChangeTraceMode('broken');
            }}
            className={`px-2 py-0.5 rounded transition ${
              traceMode === 'broken'
                ? 'bg-red-500/20 text-red-300 font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Broken Trace
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              onChangeTraceMode('healed');
            }}
            className={`px-2 py-0.5 rounded transition ${
              traceMode === 'healed'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Healed Trace
          </button>
        </div>
      </div>

      {/* Hop Step Buttons Scrubber Row */}
      <div className="px-3 py-2 bg-[#0e0e12] border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto shrink-0">
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
              className={`px-2.5 py-1.5 rounded-lg border text-left font-mono text-[10px] transition flex items-center gap-2 shrink-0 ${
                isCurrent
                  ? 'bg-zinc-800/90 border-cyan-400 text-white ring-1 ring-cyan-400/40'
                  : isCrash
                  ? 'bg-red-950/25 border-red-800/50 text-red-300 hover:bg-red-950/40'
                  : isStarved
                  ? 'bg-zinc-900/40 border-dashed border-zinc-800 text-zinc-500'
                  : isHealedHop
                  ? 'bg-emerald-950/25 border-emerald-800/50 text-emerald-300'
                  : 'bg-[#121216] border-zinc-800 text-zinc-300 hover:bg-zinc-800/50'
              }`}
            >
              {isCrash ? (
                <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />
              ) : isStarved ? (
                <Ban className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              ) : (
                <CheckCircle2
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isHealedHop ? 'text-emerald-400' : 'text-sky-400'
                  }`}
                />
              )}
              <div>
                <div className="font-bold">
                  Hop {hop.step}: {hop.node_id.split('::')[1] || hop.node_id}
                </div>
                <div className="text-[9px] opacity-75">
                  @{hop.timestamp_ms}ms • {hop.event}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Memory Payload Snapshot Inspector */}
      {currentHop && (
        <div className="flex-1 p-3 grid grid-cols-1 md:grid-cols-12 gap-3 overflow-y-auto font-mono text-xs select-text">
          {/* Left 7 cols: Live f_locals JSON Payload Snapshot */}
          <div className="md:col-span-7 flex flex-col bg-[#070709] border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-2.5 py-1.5 bg-[#111114] border-b border-zinc-800 flex items-center justify-between text-[10px]">
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <Database className="w-3 h-3" />
                LIVE MEMORY PAYLOAD SNAPSHOT (`frame.f_locals` @ {currentHop.timestamp_ms}ms)
              </span>
              <span className="text-zinc-400">{currentHop.node_id}</span>
            </div>
            <pre className="p-2.5 text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(currentHop.payload_snapshot, null, 2)}
            </pre>
          </div>

          {/* Right 5 cols: Hop Outcome / Crash Exception or Return Preview */}
          <div className="md:col-span-5 flex flex-col bg-[#070709] border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-2.5 py-1.5 bg-[#111114] border-b border-zinc-800 flex items-center justify-between text-[10px]">
              <span className="text-zinc-300 font-bold uppercase">
                Hop Transition Outcome ({currentHop.event})
              </span>
              <span
                className={`px-1.5 py-0.2 rounded font-bold ${
                  currentHop.status === 'CRASHED'
                    ? 'bg-red-500/20 text-red-300'
                    : currentHop.status === 'STARVED'
                    ? 'bg-zinc-800 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {currentHop.status}
              </span>
            </div>
            <div className="p-2.5 text-[11px] leading-relaxed overflow-y-auto">
              {currentHop.error_detail ? (
                <div className="text-red-300 bg-red-950/25 border border-red-900/50 rounded p-2">
                  {currentHop.error_detail}
                </div>
              ) : (
                <div className="text-emerald-300 bg-emerald-950/20 border border-emerald-900/40 rounded p-2">
                  {currentHop.return_preview || 'Payload validated and forwarded to next stage.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
