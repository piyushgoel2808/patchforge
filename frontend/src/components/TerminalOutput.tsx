import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface TerminalOutputProps {
  initialOutput?: any;
  currentOutput?: any;
  status: string;
  isHealing: boolean;
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({
  initialOutput,
  currentOutput,
  status,
  isHealing,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [initialOutput, currentOutput, status]);

  const activeOutput = currentOutput || initialOutput;
  const isHealed = status === 'HEALED';
  const isFailed = status === 'FAILED';

  const formatTerminalLines = () => {
    if (!activeOutput) {
      return (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
          <TerminalIcon className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
          <span>Sandbox terminal ready. Run a scenario to execute tests.</span>
        </div>
      );
    }

    const fullLog = `${activeOutput.stdout || ''}\n${activeOutput.stderr || ''}`.trim();
    const lines = fullLog.split('\n');

    return lines.map((line, idx) => {
      let colorClass = 'text-slate-300';
      if (line.includes('PASSED') || line.includes('passed in') || line.includes('100%')) {
        colorClass = 'text-emerald-400 font-bold';
      } else if (line.includes('FAILED') || line.includes('FAILURES') || line.includes('Error') || line.includes('AssertionError')) {
        colorClass = 'text-rose-400 font-semibold';
      } else if (line.startsWith('rootdir:') || line.startsWith('platform')) {
        colorClass = 'text-slate-500';
      }

      return (
        <div key={idx} className={`leading-relaxed ${colorClass}`}>
          {line || ' '}
        </div>
      );
    });
  };

  return (
    <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Terminal Title Bar */}
      <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-mono text-slate-400 ml-2 flex items-center gap-1.5">
            <TerminalIcon className="w-3.5 h-3.5 text-slate-400" />
            sandbox: pytest -v --tb=short
          </span>
        </div>

        {/* Status Pill */}
        <div>
          {isHealed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Tests Passed
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <XCircle className="w-3.5 h-3.5" /> Tests Failed
            </span>
          )}
          {isHealing && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20">
              <Clock className="w-3 h-3 animate-spin" /> Running Pytest Sandbox...
            </span>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={terminalRef}
        className="flex-1 p-4 font-mono text-xs overflow-auto bg-[#070a10] text-slate-200 select-text"
      >
        {formatTerminalLines()}
      </div>

      {/* Terminal Footer info */}
      {activeOutput && (
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Exit Code: {activeOutput.returncode}</span>
          <span>Duration: {activeOutput.duration_sec}s</span>
          <span>Status: {activeOutput.success ? 'SUCCESS' : 'FAILURE'}</span>
        </div>
      )}
    </div>
  );
};
