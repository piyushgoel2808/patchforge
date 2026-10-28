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

  const safeIndex = Math.min(
    Math.max(activeStepIndex, 0),
    Math.max(activeTrace.length - 1, 0)
  );
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
      <div className="p-4 text-xs font-mono pf-muted pf-card rounded-2xl border pf-border">
        Loading runtime payload execution trace...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pf-card border pf-border rounded-2xl overflow-hidden select-none">
      {/* Top Timeline Controls + Interactive Range Scrubber */}
      <div className="h-11 px-4 pf-surface border-b pf-border flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 pf-accent-text" />
          <span className="text-xs font-bold uppercase tracking-wider pf-text">
            Time-Travel Payload Replay Slider (`sys.settrace`)
          </span>
        </div>

        {/* Play / Pause / Step Controls + Interactive Range Slider */}
        <div className="flex items-center gap-2 flex-1 max-w-md mx-2">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onChangeStepIndex(Math.max(0, safeIndex - 1));
            }}
            className="p-1.5 rounded-lg pf-card border pf-border pf-text hover:opacity-80"
            title="Step Backward"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="px-3 py-1 rounded-lg pf-accent-bg text-xs font-mono font-bold flex items-center gap-1 shadow-sm"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            {isPlaying ? 'Pause' : 'Play Trace'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onChangeStepIndex(Math.min(activeTrace.length - 1, safeIndex + 1));
            }}
            className="p-1.5 rounded-lg pf-card border pf-border pf-text hover:opacity-80"
            title="Step Forward"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Millisecond Range Scrubber */}
          <input
            type="range"
            min={0}
            max={Math.max(activeTrace.length - 1, 0)}
            step={1}
            value={safeIndex}
            onChange={(e) => {
              setIsPlaying(false);
              onChangeStepIndex(Number(e.target.value));
            }}
            className="flex-1 accent-indigo-600 cursor-pointer h-1.5 rounded-lg"
            title="Scrub across execution hops"
          />
          <span className="text-[11px] font-mono font-bold pf-accent-text whitespace-nowrap">
            @{currentHop?.timestamp_ms ?? 0}ms
          </span>
        </div>

        {/* Before vs. After Trace Toggle */}
        <div className="flex items-center pf-card border pf-border rounded-xl p-0.5 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onChangeTraceMode('broken');
            }}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              traceMode === 'broken'
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                : 'pf-muted hover:pf-text'
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
            className={`px-2.5 py-1 rounded-lg font-bold transition ${
              traceMode === 'healed'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                : 'pf-muted hover:pf-text'
            }`}
          >
            Healed Trace
          </button>
        </div>
      </div>

      {/* Main Split Body: Left 5 cols (Hop Stepper) + Right 7 cols (Live Memory JSON Inspector) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x pf-border overflow-hidden">
        {/* Left 5 cols: Hop Cards */}
        <div className="lg:col-span-5 p-3 overflow-y-auto space-y-2 pf-surface">
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
                className={`w-full px-3 py-2 rounded-xl border-2 text-left font-mono text-xs transition flex items-center justify-between gap-2 ${
                  isCurrent
                    ? 'pf-card pf-accent-border pf-text shadow-md'
                    : isCrash
                    ? 'bg-rose-500/10 border-rose-500/40 pf-text'
                    : isStarved
                    ? 'pf-card border-dashed pf-border opacity-65'
                    : 'pf-card pf-border hover:opacity-95'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isCrash ? (
                    <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
                  ) : isStarved ? (
                    <Ban className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        isHealedHop ? 'text-emerald-500' : 'text-sky-500'
                      }`}
                    />
                  )}
                  <div className="truncate">
                    <div className="font-bold text-[11px] pf-text truncate">
                      Hop {hop.step}: {hop.node_id.split('::')[0]}
                    </div>
                    <div className="text-[10px] pf-muted truncate">
                      {hop.node_id.split('::')[1] || hop.function}()
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold block ${
                      isCrash
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300'
                        : isStarved
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                        : 'pf-accent-tint border'
                    }`}
                  >
                    {hop.event}
                  </span>
                  <span className="text-[9.5px] pf-muted mt-0.5 block">
                    @{hop.timestamp_ms}ms
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right 7 cols: Live JSON Payload in Memory + Hop Transition Outcome */}
        {currentHop && (
          <div className="lg:col-span-7 p-3.5 overflow-y-auto pf-card space-y-3 font-mono select-text">
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed ${
                currentHop.error_detail
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[10.5px] uppercase mb-1">
                <span>
                  Hop {currentHop.step} Outcome ({currentHop.node_id})
                </span>
                <span>@{currentHop.timestamp_ms}ms</span>
              </div>
              {currentHop.error_detail || currentHop.return_preview}
            </div>

            <div className="rounded-xl border pf-border overflow-hidden">
              <div className="px-3 py-1.5 pf-surface border-b pf-border flex items-center justify-between text-[10.5px] pf-accent-text font-bold">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  LIVE PAYLOAD SNAPSHOT IN MEMORY (`frame.f_locals`)
                </span>
                <span className="pf-muted">{currentHop.file}</span>
              </div>
              <pre className="p-3 text-[11px] bg-[#090d16] text-emerald-300 max-h-36 overflow-y-auto overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                {JSON.stringify(currentHop.payload_snapshot, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
