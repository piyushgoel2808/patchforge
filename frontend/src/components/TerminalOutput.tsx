import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, CheckCircle2, XCircle, Clock } from 'lucide-react';

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

  const getLogContent = (): string => {
    if (initialOutput && currentOutput && currentOutput !== initialOutput) {
      const initText = `${initialOutput.stdout || ''}\n${initialOutput.stderr || ''}`.trim();
      const verifyText = `${currentOutput.stdout || ''}\n${currentOutput.stderr || ''}`.trim();
      return [
        '>>> [STAGE 1] BASELINE PYTEST EXECUTION (PRE-PATCH)',
        initText,
        '',
        '>>> [STAGE 5] POST-PATCH VERIFICATION PYTEST EXECUTION (AFTER NEMOTRON SUPER DIFF)',
        verifyText,
      ].join('\n');
    }
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
      let colorClass = 'pf-text';

      if (line.startsWith('>>> [')) {
        colorClass = 'pf-accent-text font-bold pf-accent-tint px-2 py-0.5 rounded my-1 border';
      } else if (
        line.includes('PASSED') ||
        line.includes('passed in') ||
        line.includes('100%') ||
        line.includes('0 failed')
      ) {
        colorClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
      } else if (
        line.includes('FAILED') ||
        line.includes('FAILURES') ||
        line.includes('AssertionError') ||
        line.includes('TypeError') ||
        line.includes('PydanticDeprecatedSince20') ||
        line.includes('Error:') ||
        line.includes('failed')
      ) {
        colorClass = 'text-rose-600 dark:text-rose-400 font-semibold';
      } else if (
        line.startsWith('rootdir:') ||
        line.startsWith('platform') ||
        line.startsWith('collected ')
      ) {
        colorClass = 'pf-muted';
      } else if (line.startsWith('=====')) {
        colorClass =
          line.includes('FAILURES') || line.includes('failed')
            ? 'text-rose-600 dark:text-rose-400 font-bold'
            : 'text-emerald-600 dark:text-emerald-400 font-bold';
      }

      return (
        <div key={idx} className={`leading-relaxed whitespace-pre font-mono text-[11px] ${colorClass}`}>
          {line || ' '}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full pf-card overflow-hidden select-text">
      {/* Header */}
      <div className="h-10 px-4 pf-surface border-b pf-border flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 pf-accent-text" />
          <span className="text-xs font-bold pf-text">
            Sandbox Test Runner (`pytest -v`)
          </span>
        </div>

        <div>
          {isHealed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" /> 100% PASSED
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
              <XCircle className="w-3 h-3" /> TESTS FAILED
            </span>
          )}
          {isHealing && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <Clock className="w-3 h-3 animate-spin" /> SANDBOX ACTIVE...
            </span>
          )}
          {isIdle && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
              FAILING (Baseline)
            </span>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={terminalRef}
        className="flex-1 p-3.5 overflow-y-auto overflow-x-auto font-mono text-xs pf-card"
      >
        {renderLines()}
      </div>

      {/* Terminal Footer */}
      <div className="h-7 px-4 pf-surface border-t pf-border flex items-center justify-between text-[10px] font-mono pf-muted shrink-0">
        <span>Exit code: {isHealed ? 0 : 1}</span>
        <span>
          Duration:{' '}
          {currentOutput?.duration_sec !== undefined
            ? `${currentOutput.duration_sec}s`
            : '0.04s'}
        </span>
        <span>Isolated Pytest Subprocess</span>
      </div>
    </div>
  );
};
