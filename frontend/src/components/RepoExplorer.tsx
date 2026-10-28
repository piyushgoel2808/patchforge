import React from 'react';
import { FolderTree, FileCode, AlertCircle, Cpu, Brain } from 'lucide-react';

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
  triageData,
  refactoringPlan,
}) => {
  return (
    <div className="flex flex-col h-full pf-card overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-10 px-4 pf-surface border-b pf-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <FolderTree className="w-4 h-4 pf-accent-text" />
          <span className="text-xs font-bold tracking-wider pf-text uppercase">
            Repository Explorer
          </span>
        </div>
        {scenario && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full pf-accent-tint border font-semibold">
            {scenario.target_library}@{scenario.target_version}
          </span>
        )}
      </div>

      {/* Scenario Info & File Tree */}
      <div className="p-3.5 border-b pf-border shrink-0 space-y-3">
        <div>
          <h3 className="text-xs font-bold pf-text leading-tight">
            {scenario?.title || 'Active Target Repository'}
          </h3>
          <p className="text-[11px] pf-muted mt-1 leading-relaxed">
            {scenario?.description}
          </p>
        </div>

        {/* Files List */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono pf-muted uppercase tracking-wider font-bold block">
            Workspace Files ({scenario?.files?.length || 0})
          </span>
          {scenario?.files?.map((file) => {
            const isSelected = activeFilename === file.filename;
            return (
              <div
                key={file.filename}
                onClick={() => onSelectFile(file.filename)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono cursor-pointer transition border ${
                  isSelected
                    ? 'pf-surface pf-accent-border pf-text font-bold shadow-sm'
                    : 'border-transparent pf-muted hover:pf-text hover:pf-surface'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode
                    className={`w-4 h-4 shrink-0 ${
                      file.is_target ? 'text-rose-500' : 'pf-accent-text'
                    }`}
                  />
                  <span className="truncate">{file.filename}</span>
                </div>

                {file.is_target && (
                  <span className="text-[9.5px] px-2 py-0.2 rounded-full font-sans font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 shrink-0">
                    Crash Target
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Diagnosis & Architectural Plan Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono pf-muted uppercase tracking-wider font-bold block">
            Triage & Plan Diagnostics
          </span>
          {triageData && (
            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full pf-accent-tint border font-semibold">
              Confidence: {(triageData.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {!triageData && !refactoringPlan && (
          <div className="space-y-2">
            <span className="text-xs pf-muted block">
              Failing unit test assertions in baseline run:
            </span>
            <div className="space-y-1.5">
              {scenario?.failing_tests?.map((t, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] font-mono text-rose-600 dark:text-rose-300 flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {triageData && (
          <div className="p-3 pf-surface border pf-border rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold pf-accent-text">
              <Cpu className="w-3.5 h-3.5" />
              Nano 30B Triage Diagnosis
            </div>
            <p className="text-xs pf-text leading-relaxed">{triageData.root_cause}</p>
          </div>
        )}

        {refactoringPlan && (
          <div className="p-3 pf-surface border pf-border rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold pf-accent-text">
              <Brain className="w-3.5 h-3.5" />
              Ultra 550B Architectural Plan
            </div>
            <div className="text-[11px] font-mono pf-text whitespace-pre-wrap leading-relaxed">
              {refactoringPlan}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
