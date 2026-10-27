import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, CheckCircle2, XCircle, Clock, Play } from 'lucide-react';

interface TerminalOutputProps {
  initialOutput?: any;
  currentOutput?: any;
  baselineStderr?: string;
  status: string;
  isHealing: boolean;
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({
  initialOutput,
  currentOutput,
  baselineStderr,
  status,
  isHealing,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [initialOutput, currentOutput, baselineStderr, status, isHealing]);

  const isHealed = status === 'HEALED';
  const isFailed = status === 'FAILED';
  const isIdle = status === 'IDLE';

  // Determine what log text to show
  const getLogContent = (): string => {
    if (currentOutput) {
      return `${currentOutput.stdout || ''}\n${currentOutput.stderr || ''}`.trim();
    }
    if (initialOutput) {
      return `${initialOutput.stdout || ''}\n${initialOutput.stderr || ''}`.trim();
    }
    if (baselineStderr) {
      return baselineStderr.trim();
    }
    return 'Sandbox terminal ready. Select a scenario to view initial test execution.';
  };

  const renderLines = () => {
    const raw = getLogContent();
    const lines = raw.split('\n');

    return lines.map((line, idx) => {
      let colorClass = 'text-zinc-300';

      if (line.includes('PASSED') || line.includes('passed in') || line.includes('100%') || line.includes('0 failed')) {
        colorClass = 'text-emerald-400 font-semibold';
      } else if (
        line.includes('FAILED') ||
        line.includes('FAILURES') ||
        line.includes('AssertionError') ||
        line.includes('Error:') ||
        line.includes('1 failed')
      ) {
        colorClass = 'text-red-400 font-medium';
      } else if (line.startsWith('rootdir:') || line.startsWith('platform') || line.startsWith('collected ')) {
        colorClass = 'text-zinc-500';
      } else if (line.startsWith('=====')) {
        colorClass = line.includes('FAILURES') || line.includes('failed') ? 'text-red-500/80 font-bold' : 'text-zinc-500';
      } else if (line.startsWith('E   ') || line.startsWith('E       ')) {
        colorClass = 'text-red-300 bg-red-950/20 px-1 rounded';
      }

      return (
        <div key={idx} className={`leading-relaxed whitespace-pre font-mono text-[11px] ${colorClass}`}>
          {line || ' '}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#070709] overflow-hidden select-text">
      {/* Header */}
      <div className="h-9 px-3 bg-[#111114] border-b border-zinc-800 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-[11px] font-mono text-zinc-400 ml-1.5 flex items-center gap-1">
            <TerminalIcon className="w-3 h-3 text-zinc-500" />
            pytest -v --tb=short
          </span>
        </div>

        {/* Status Badge */}
        <div>
          {isHealed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" /> 100% PASSED
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/30">
              <XCircle className="w-3 h-3" /> TESTS FAILED
            </span>
          )}
          {isHealing && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20">
              <Clock className="w-3 h-3 animate-spin" /> RUNNING...
            </span>
          )}
          {isIdle && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
              FAILING (Baseline)
            </span>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={terminalRef}
        className="flex-1 p-3 overflow-y-auto overflow-x-auto font-mono text-xs text-zinc-300"
      >
        {renderLines()}
      </div>

      {/* Terminal Footer bar */}
      <div className="h-6 px-3 bg-[#0c0c0f] border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500 shrink-0">
        <span>Exit code: {isHealed ? 0 : 1}</span>
        <span>Environment: Python 3.15 Sandbox</span>
        <span>Isolated Temp Workspace</span>
      </div>
    </div>
  );
};
