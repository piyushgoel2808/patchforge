import React, { useState } from 'react';
import {
  FileCode,
  GitPullRequest,
  Download,
  Check,
  Sparkles,
  BookOpen,
  ExternalLink,
  Columns,
  AlignJustify,
  AlertTriangle,
  Globe,
  Copy,
  X,
} from 'lucide-react';

interface ScenarioFile {
  filename: string;
  content: string;
  is_target: boolean;
  language: string;
}

interface Citation {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

interface DiffViewerProps {
  activeTab: 'source' | 'diff' | 'citations';
  onTabChange: (tab: 'source' | 'diff' | 'citations') => void;
  activeFile?: ScenarioFile;
  diffText: string;
  patchExplanation?: string;
  patchedFiles?: Record<string, string>;
  citations: Citation[];
  tavilySummary?: string;
  buggyLines?: number[];
  onExportPR: () => void;
  prBundle?: any;
  onClosePrBundle?: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  activeTab,
  onTabChange,
  activeFile,
  diffText,
  patchExplanation,
  citations,
  tavilySummary,
  buggyLines = [],
  onExportPR,
  prBundle,
  onClosePrBundle,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedPrMd, setCopiedPrMd] = useState(false);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  const copyPatch = () => {
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPrMarkdown = () => {
    if (prBundle?.pr_markdown) {
      navigator.clipboard.writeText(prBundle.pr_markdown);
      setCopiedPrMd(true);
      setTimeout(() => setCopiedPrMd(false), 2000);
    }
  };

  const downloadPatch = () => {
    const blob = new Blob([diffText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patchforge-fix.patch';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderInlineTavilyHeader = () => {
    if (!diffText.trim()) return null;
    return (
      <div className="p-3.5 pf-surface border-b pf-border space-y-2 font-sans">
        {patchExplanation && (
          <div className="flex items-start gap-2 text-xs pf-text">
            <Sparkles className="w-4 h-4 pf-accent-text shrink-0 mt-0.5" />
            <div>
              <span className="font-bold pf-accent-text">Nemotron 3 Super 120B Synthesis: </span>
              <span>{patchExplanation}</span>
            </div>
          </div>
        )}

        {citations.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-semibold pf-accent-text flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Grounded via Tavily Live Search:
            </span>
            {citations.map((c, i) => (
              <a
                key={i}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full pf-accent-tint border text-[11px] font-medium transition hover:opacity-85"
                title={c.snippet}
              >
                <span className="truncate max-w-[190px]">{c.title}</span>
                <span className="opacity-75">({Math.round(c.score * 100)}%)</span>
                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSourceCode = () => {
    if (!activeFile || !activeFile.content) {
      return (
        <div className="h-full flex items-center justify-center pf-muted font-mono text-xs">
          Select a repository file above to view its source code.
        </div>
      );
    }

    const lines = activeFile.content.split('\n');

    return (
      <div className="min-w-full font-mono text-xs py-2">
        {lines.map((line, idx) => {
          const lineNum = idx + 1;
          const isBuggy = activeFile.is_target && buggyLines.includes(lineNum);

          return (
            <div
              key={lineNum}
              className={`flex items-start transition-colors ${
                isBuggy
                  ? 'bg-rose-500/15 border-l-4 border-rose-500'
                  : 'border-l-4 border-transparent hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="w-10 shrink-0 select-none text-right pr-3 pf-muted py-0.5 border-r pf-border font-mono text-[11px]">
                {lineNum}
              </div>
              <div className="flex-1 px-3 py-0.5 whitespace-pre overflow-x-auto pf-text">
                {line || ' '}
                {isBuggy && (
                  <span className="ml-3 inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10px] font-sans font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 select-none">
                    <AlertTriangle className="w-2.5 h-2.5" /> Deprecated / Vulnerable
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderUnifiedDiff = () => {
    if (!diffText.trim()) {
      return (
        <div className="h-full flex flex-col items-center justify-center pf-muted text-xs p-6 text-center">
          <FileCode className="w-8 h-8 mb-2 opacity-40 pf-accent-text" />
          <span className="pf-text font-semibold text-sm">No Code Patch Generated Yet</span>
          <span className="pf-muted text-xs mt-1 max-w-sm">
            Click "Run Autonomous Heal" above to watch Nemotron 3 Super 120B synthesize a verified Git diff.
          </span>
        </div>
      );
    }

    const lines = diffText.split('\n');

    return (
      <div className="min-w-full font-mono text-xs">
        {renderInlineTavilyHeader()}
        {lines.map((line, idx) => {
          let bgClass = 'pf-text border-l-4 border-transparent';

          if (line.startsWith('@@')) {
            bgClass = 'pf-surface pf-accent-text font-semibold border-l-4 pf-accent-border';
          } else if (line.startsWith('+') && !line.startsWith('+++')) {
            bgClass =
              'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium border-l-4 border-emerald-500';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            bgClass =
              'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-l-4 border-rose-500 line-through opacity-85';
          } else if (line.startsWith('---') || line.startsWith('+++')) {
            bgClass = 'pf-surface pf-muted font-bold border-l-4 pf-border';
          }

          return (
            <div key={idx} className={`flex items-start ${bgClass}`}>
              <div className="w-9 shrink-0 select-none text-right pr-2 pf-muted py-0.5 border-r pf-border text-[10px]">
                {idx + 1}
              </div>
              <div className="flex-1 px-3 py-0.5 whitespace-pre overflow-x-auto">
                {line || ' '}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSplitDiff = () => {
    const lines = diffText.split('\n');
    const oldLines: string[] = [];
    const newLines: string[] = [];

    lines.forEach((line) => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        newLines.push(line.slice(1));
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        oldLines.push(line.slice(1));
      } else if (!line.startsWith('@@') && !line.startsWith('---') && !line.startsWith('+++')) {
        oldLines.push(line);
        newLines.push(line);
      }
    });

    return (
      <div className="min-h-full flex flex-col">
        {renderInlineTavilyHeader()}
        <div className="grid grid-cols-2 divide-x pf-border font-mono text-xs flex-1">
          <div className="overflow-x-auto">
            <div className="px-3 py-1.5 pf-surface text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 border-b pf-border">
              Original (Broken)
            </div>
            {oldLines.map((l, i) => (
              <div
                key={i}
                className="px-3 py-0.5 text-rose-700 dark:text-rose-300 whitespace-pre"
              >
                {l || ' '}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <div className="px-3 py-1.5 pf-surface text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 border-b pf-border">
              Patched (Nemotron 3 Super 120B)
            </div>
            {newLines.map((l, i) => (
              <div
                key={i}
                className="px-3 py-0.5 text-emerald-700 dark:text-emerald-300 whitespace-pre"
              >
                {l || ' '}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full pf-card overflow-hidden relative">
      {/* Editor Tab Bar */}
      <div className="h-11 border-b pf-border pf-surface px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onTabChange('source')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'source'
                ? 'pf-card pf-text shadow-sm border pf-border'
                : 'pf-muted hover:pf-text'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 pf-accent-text" />
            {activeFile?.filename || 'Source Code'}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('diff')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'diff'
                ? 'pf-accent-bg shadow-sm'
                : 'pf-muted hover:pf-text'
            }`}
          >
            <span className="font-mono font-bold">±</span>
            Synthesized Git Diff
            {diffText && <span className="w-2 h-2 rounded-full bg-current animate-pulse" />}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('citations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'citations'
                ? 'pf-card pf-text shadow-sm border pf-border'
                : 'pf-muted hover:pf-text'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 pf-accent-text" />
            Tavily Sources ({citations.length})
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5">
          {activeTab === 'diff' && diffText && (
            <>
              <div className="flex items-center pf-card border pf-border rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('unified')}
                  className={`p-1 rounded ${
                    viewMode === 'unified' ? 'pf-accent-bg' : 'pf-muted hover:pf-text'
                  }`}
                  title="Unified Diff View"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`p-1 rounded ${
                    viewMode === 'split' ? 'pf-accent-bg' : 'pf-muted hover:pf-text'
                  }`}
                  title="Side-by-Side Split View"
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={downloadPatch}
                className="p-1.5 pf-card hover:opacity-80 pf-text rounded-lg border pf-border text-xs transition"
                title="Download .patch file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={copyPatch}
                className="px-2.5 py-1 pf-card hover:opacity-80 pf-text rounded-lg border pf-border text-xs transition flex items-center gap-1 font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 pf-accent-text" /> : <FileCode className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : '.patch'}
              </button>

              <button
                type="button"
                onClick={onExportPR}
                className="px-3 py-1 pf-accent-bg font-bold rounded-lg text-xs transition flex items-center gap-1 shadow-sm"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                Export PR
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto pf-card">
        {activeTab === 'source' && renderSourceCode()}
        {activeTab === 'diff' && (viewMode === 'unified' ? renderUnifiedDiff() : renderSplitDiff())}

        {activeTab === 'citations' && (
          <div className="p-5 space-y-3">
            <div className="p-4 pf-accent-tint border rounded-xl">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                Live Documentation Grounded via Tavily Search API
              </div>
              <p className="pf-muted text-xs mt-1">
                {tavilySummary ||
                  'PatchForge queries live official documentation and CVE advisories at runtime to prevent pre-training cutoff hallucinations.'}
              </p>
            </div>

            {citations.length === 0 ? (
              <div className="text-center py-12 pf-muted text-xs">
                Click "Run Autonomous Heal" to trigger live runtime Tavily documentation & CVE retrieval.
              </div>
            ) : (
              citations.map((c, idx) => (
                <a
                  key={idx}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 pf-surface hover:opacity-95 border pf-border rounded-xl transition group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold pf-text group-hover:pf-accent-text flex items-center gap-1.5 transition">
                      {c.title}
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full pf-accent-tint border font-semibold">
                      Relevance: {(c.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs pf-muted mt-1.5 leading-relaxed">{c.snippet}</p>
                  <span className="text-[10px] font-mono pf-muted mt-1.5 block truncate">{c.url}</span>
                </a>
              ))
            )}
          </div>
        )}
      </div>

      {/* Interactive PR Bundle Drawer */}
      {prBundle && (
        <div className="border-t-2 pf-accent-border pf-surface p-4 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold pf-accent-bg">
                SHA: {prBundle.commit_hash}
              </span>
              <span className="text-xs font-bold pf-text">
                Branch `{prBundle.branch}` Ready to Merge
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={copyPrMarkdown}
                className="px-2.5 py-1 pf-card pf-text rounded-lg text-[11px] font-semibold flex items-center gap-1 border pf-border"
              >
                {copiedPrMd ? <Check className="w-3 h-3 pf-accent-text" /> : <Copy className="w-3 h-3" />}
                {copiedPrMd ? 'Copied PR Markdown' : 'Copy PR Description'}
              </button>
              <button
                type="button"
                onClick={downloadPatch}
                className="px-2.5 py-1 pf-accent-bg font-bold rounded-lg text-[11px] flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Download .patch
              </button>
              {onClosePrBundle && (
                <button
                  type="button"
                  onClick={onClosePrBundle}
                  className="p-1 pf-muted hover:pf-text"
                  title="Close PR Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <pre className="max-h-28 overflow-y-auto p-3 rounded-xl pf-card border pf-border text-[10px] font-mono pf-text whitespace-pre-wrap select-text">
            {prBundle.pr_markdown}
          </pre>
        </div>
      )}
    </div>
  );
};
