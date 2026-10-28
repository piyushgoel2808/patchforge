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
      <div className="p-3 bg-[#101218] border-b border-zinc-800 space-y-2">
        {patchExplanation && (
          <div className="flex items-start gap-2 text-xs text-zinc-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-400">Nemotron 3 Super 120B Synthesis: </span>
              <span>{patchExplanation}</span>
            </div>
          </div>
        )}

        {citations.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] font-mono text-sky-400 flex items-center gap-1 font-semibold">
              <Globe className="w-3 h-3" /> Grounded via Tavily Live Search:
            </span>
            {citations.map((c, i) => (
              <a
                key={i}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-mono transition"
                title={c.snippet}
              >
                <span className="truncate max-w-[180px]">{c.title}</span>
                <span className="text-sky-400/80">({Math.round(c.score * 100)}%)</span>
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
        <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs">
          Select a repository file from the explorer.
        </div>
      );
    }

    const lines = activeFile.content.split('\n');

    return (
      <div className="min-w-full font-mono text-xs">
        {lines.map((line, idx) => {
          const lineNum = idx + 1;
          const isBuggy = activeFile.is_target && buggyLines.includes(lineNum);

          return (
            <div
              key={lineNum}
              className={`flex items-start hover:bg-zinc-800/40 transition-colors ${
                isBuggy ? 'bg-red-950/25 border-l-2 border-red-500/80' : 'border-l-2 border-transparent'
              }`}
            >
              <div className="w-10 shrink-0 select-none text-right pr-3 text-zinc-600 bg-[#0d0d10] py-0.5 border-r border-zinc-800/60 font-mono text-[11px]">
                {lineNum}
              </div>
              <div className="flex-1 px-3 py-0.5 whitespace-pre overflow-x-auto text-zinc-200">
                {line || ' '}
                {isBuggy && (
                  <span className="ml-3 inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 select-none">
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
        <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs p-6 text-center">
          <FileCode className="w-8 h-8 mb-2 opacity-40 text-zinc-400" />
          <span className="text-zinc-300 font-medium">No patch synthesized yet</span>
          <span className="text-zinc-500 text-[11px] mt-1">
            Click "⚡ Run Auto-Heal" above to let Nemotron 3 Super 120B generate surgical diffs.
          </span>
        </div>
      );
    }

    const lines = diffText.split('\n');

    return (
      <div className="min-w-full font-mono text-xs">
        {renderInlineTavilyHeader()}
        {lines.map((line, idx) => {
          let bgClass = 'hover:bg-zinc-800/30 text-zinc-300 border-l-2 border-transparent';

          if (line.startsWith('@@')) {
            bgClass = 'bg-zinc-900/90 text-sky-400 font-semibold border-l-2 border-sky-500/60';
          } else if (line.startsWith('+') && !line.startsWith('+++')) {
            bgClass = 'bg-emerald-950/30 text-emerald-300 font-medium border-l-2 border-emerald-500';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            bgClass = 'bg-red-950/30 text-red-300 border-l-2 border-red-500 line-through opacity-85';
          } else if (line.startsWith('---') || line.startsWith('+++')) {
            bgClass = 'bg-zinc-900 text-zinc-400 font-bold border-l-2 border-zinc-700';
          }

          return (
            <div key={idx} className={`flex items-start ${bgClass}`}>
              <div className="w-8 shrink-0 select-none text-right pr-2 text-zinc-600 bg-[#0d0d10] py-0.5 border-r border-zinc-800/60 text-[10px]">
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
        <div className="grid grid-cols-2 divide-x divide-zinc-800 font-mono text-xs flex-1">
          <div className="overflow-x-auto">
            <div className="px-3 py-1 bg-zinc-900/80 text-[10px] uppercase font-bold text-red-400 border-b border-zinc-800">
              Original (Broken)
            </div>
            {oldLines.map((l, i) => (
              <div key={i} className="px-3 py-0.5 hover:bg-zinc-800/30 text-red-300/90 whitespace-pre">
                {l || ' '}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <div className="px-3 py-1 bg-zinc-900/80 text-[10px] uppercase font-bold text-emerald-400 border-b border-zinc-800">
              Patched (Nemotron 3 Super 120B)
            </div>
            {newLines.map((l, i) => (
              <div key={i} className="px-3 py-0.5 hover:bg-zinc-800/30 text-emerald-300 whitespace-pre">
                {l || ' '}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] overflow-hidden relative">
      {/* Editor Tab Bar */}
      <div className="h-10 border-b border-zinc-800 bg-[#111114] px-3 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTabChange('source')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'source'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-zinc-400" />
            {activeFile?.filename || 'Source Code'}
          </button>

          <button
            onClick={() => onTabChange('diff')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'diff'
                ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <span className="font-mono text-emerald-400 font-bold">±</span>
            Synthesized Git Diff
            {diffText && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          <button
            onClick={() => onTabChange('citations')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'citations'
                ? 'bg-zinc-800 text-sky-400 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            Tavily Grounding ({citations.length})
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5">
          {activeTab === 'diff' && diffText && (
            <>
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-xs">
                <button
                  onClick={() => setViewMode('unified')}
                  className={`p-1 rounded ${
                    viewMode === 'unified' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="Unified Diff View"
                >
                  <AlignJustify className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`p-1 rounded ${
                    viewMode === 'split' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="Side-by-Side Split View"
                >
                  <Columns className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={downloadPatch}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-800 text-xs transition"
                title="Download .patch file"
              >
                <Download className="w-3 h-3" />
              </button>

              <button
                onClick={copyPatch}
                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-800 text-xs transition flex items-center gap-1 font-mono"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <FileCode className="w-3 h-3" />}
                {copied ? 'Copied' : '.patch'}
              </button>

              <button
                onClick={onExportPR}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded text-xs transition flex items-center gap-1 shadow-sm"
              >
                <GitPullRequest className="w-3 h-3" />
                Export PR
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto bg-[#09090b]">
        {activeTab === 'source' && renderSourceCode()}
        {activeTab === 'diff' && (viewMode === 'unified' ? renderUnifiedDiff() : renderSplitDiff())}

        {activeTab === 'citations' && (
          <div className="p-4 space-y-3">
            <div className="p-3 bg-sky-950/20 border border-sky-800/30 rounded-lg">
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Live Documentation Grounded via Tavily Search API
              </div>
              <p className="text-zinc-400 text-xs mt-1">
                {tavilySummary ||
                  'PatchForge queries live official documentation and CVE advisories at runtime to prevent pre-training cutoff hallucinations.'}
              </p>
            </div>

            {citations.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 font-mono text-xs">
                Click "⚡ Run Auto-Heal" to trigger live runtime Tavily documentation & CVE retrieval.
              </div>
            ) : (
              citations.map((c, idx) => (
                <a
                  key={idx}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-sky-500/50 rounded-lg transition group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-sky-400 flex items-center gap-1.5 transition">
                      {c.title}
                      <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Relevance: {(c.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{c.snippet}</p>
                  <span className="text-[10px] font-mono text-zinc-500 mt-1.5 block truncate">{c.url}</span>
                </a>
              ))
            )}
          </div>
        )}
      </div>

      {/* Interactive PR Bundle Drawer */}
      {prBundle && (
        <div className="border-t border-emerald-500/40 bg-[#101418] p-3 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SHA: {prBundle.commit_hash}
              </span>
              <span className="text-xs font-semibold text-white">
                Branch `{prBundle.branch}` Ready to Merge
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={copyPrMarkdown}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-mono flex items-center gap-1 border border-zinc-700"
              >
                {copiedPrMd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedPrMd ? 'Copied PR Markdown' : 'Copy PR Description'}
              </button>
              <button
                onClick={downloadPatch}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded text-[11px] flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Download .patch
              </button>
              {onClosePrBundle && (
                <button
                  onClick={onClosePrBundle}
                  className="p-1 text-zinc-400 hover:text-zinc-200"
                  title="Close PR Preview"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <pre className="max-h-28 overflow-y-auto p-2 rounded bg-[#09090b] border border-zinc-800 text-[10px] font-mono text-zinc-300 whitespace-pre-wrap select-text">
            {prBundle.pr_markdown}
          </pre>
        </div>
      )}
    </div>
  );
};
