import React from 'react';
import { FolderTree, FileCode, AlertCircle, Sparkles, Brain, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

interface ScenarioFile {
  filename: string;
  content: string;
  is_target: boolean;
  language: string;
}

interface Scenario {
  id: string;
  title: string;
  category: string;
  target_library: string;
  target_version: string;
  description: string;
  failing_tests: string[];
  files: ScenarioFile[];
}

interface RepoExplorerProps {
  scenario?: Scenario;
  activeFilename: string;
  onSelectFile: (filename: string) => void;
  status: string;
  triageData?: any;
  refactoringPlan?: string;
}

export const RepoExplorer: React.FC<RepoExplorerProps> = ({
  scenario,
  activeFilename,
  onSelectFile,
  status,
  triageData,
  refactoringPlan,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#0c0c0f] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-9 px-3 bg-[#111114] border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <FolderTree className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase">
            Repository Explorer
          </span>
        </div>
        {scenario && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            {scenario.target_library}@{scenario.target_version}
          </span>
        )}
      </div>

      {/* Scenario Info & File Tree */}
      <div className="p-3 border-b border-zinc-800 shrink-0 space-y-2.5">
        <div>
          <h3 className="text-xs font-semibold text-white leading-tight">
            {scenario?.title || 'Active Target Repository'}
          </h3>
          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
            {scenario?.description}
          </p>
        </div>

        {/* Files List */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
            Workspace Files
          </span>
          {scenario?.files?.map((file) => {
            const isSelected = activeFilename === file.filename;
            return (
              <div
                key={file.filename}
                onClick={() => onSelectFile(file.filename)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono cursor-pointer transition ${
                  isSelected
                    ? 'bg-zinc-800 text-white font-medium border border-zinc-700/80 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className={`w-3.5 h-3.5 shrink-0 ${file.is_target ? 'text-amber-400' : 'text-zinc-400'}`} />
                  <span className="truncate">{file.filename}</span>
                </div>

                {file.is_target && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-sans bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                    Failing Target
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Diagnosis & Architectural Plan Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
            Triage & Plan Diagnostics
          </span>
          {triageData && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Score: {(triageData.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {/* Before Execution: Baseline Failure State */}
        {!triageData && !refactoringPlan && (
          <div className="space-y-2">
            <span className="text-[11px] text-zinc-400 block">
              Identified failing test assertions in baseline run:
            </span>
            <div className="space-y-1">
              {scenario?.failing_tests?.map((t, idx) => (
                <div
                  key={idx}
                  className="px-2 py-1 bg-red-950/20 border border-red-800/30 rounded text-[11px] font-mono text-red-400 flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate">{t}</span>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-[11px] text-zinc-400 mt-3 leading-relaxed">
              Click <strong className="text-emerald-400">⚡ Run Auto-Heal</strong> to invoke NVIDIA Nemotron 3 Nano 30B to triage this stack trace in sub-200ms.
            </div>
          </div>
        )}

        {/* During / After Run: Nano 30B Triage Output */}
        {triageData && (
          <div className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Cpu className="w-3.5 h-3.5" />
              Nano 30B Triage Diagnosis
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
              {triageData.root_cause}
            </p>

            {triageData.deprecated_symbols && triageData.deprecated_symbols.length > 0 && (
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block mb-1">Flagged Symbols:</span>
                <div className="flex flex-wrap gap-1">
                  {triageData.deprecated_symbols.map((sym: string, i: number) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-amber-300 border border-zinc-700"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ultra 550B Architectural Plan */}
        {refactoringPlan && (
          <div className="p-2.5 bg-purple-950/20 border border-purple-800/30 rounded-lg space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400">
              <Brain className="w-3.5 h-3.5" />
              Ultra 550B Architectural Plan
            </div>
            <div className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {refactoringPlan}
            </div>
          </div>
        )}
      </div>

      {/* Explorer Footer */}
      <div className="h-6 px-3 bg-[#111114] border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-500 shrink-0">
        <span>Files: {scenario?.files?.length || 0}</span>
        <span>Branch: main</span>
      </div>
    </div>
  );
};
