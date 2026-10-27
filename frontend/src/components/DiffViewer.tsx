import React, { useState } from 'react';
import { FileCode, ExternalLink, GitPullRequest, Download, Check, Sparkles, BookOpen } from 'lucide-react';

interface Citation {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

interface DiffViewerProps {
  diffText: string;
  citations: Citation[];
  tavilySummary?: string;
  refactoringPlan?: string;
  onExportPR: () => void;
  prSuccessUrl?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diffText,
  citations,
  tavilySummary,
  refactoringPlan,
  onExportPR,
  prSuccessUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'diff' | 'citations' | 'plan'>('diff');

  const copyPatch = () => {
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderDiffLines = (rawDiff: string) => {
    if (!rawDiff.trim()) {
      return (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
          <FileCode className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
          <span>Awaiting patch synthesis from NVIDIA Nemotron 3 Super 120B...</span>
        </div>
      );
    }

    return rawDiff.split('\n').map((line, idx) => {
      let bgClass = 'text-slate-300';
      if (line.startsWith('+') && !line.startsWith('+++')) {
        bgClass = 'bg-emerald-950/40 text-emerald-300 font-medium';
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        bgClass = 'bg-rose-950/40 text-rose-300 line-through opacity-85';
      } else if (line.startsWith('@@')) {
        bgClass = 'bg-slate-800/80 text-cyan-300 font-bold';
      }

      return (
        <div key={idx} className={`px-3 py-0.5 whitespace-pre font-mono text-xs ${bgClass}`}>
          {line || ' '}
        </div>
      );
    });
  };

  return (
    <div className="bg-[#111827]/80 backdrop-blur border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header Tabs */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'diff'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            Synthesized Diff
          </button>
          <button
            onClick={() => setActiveTab('citations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'citations'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            Tavily Grounding ({citations.length})
          </button>
          {refactoringPlan && (
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'plan'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Ultra 550B Plan
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {diffText && (
            <>
              <button
                onClick={copyPatch}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors flex items-center gap-1 border border-slate-700"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy .patch'}
              </button>

              <button
                onClick={onExportPR}
                className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                Export PR
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-auto bg-[#0a0e17]">
        {activeTab === 'diff' && (
          <div className="py-2">
            {renderDiffLines(diffText)}
          </div>
        )}

        {activeTab === 'citations' && (
          <div className="p-4 space-y-3">
            <div className="p-3 bg-blue-950/20 border border-blue-800/30 rounded-xl mb-4">
              <span className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Live Documentation Grounding via Tavily Search API
              </span>
              <p className="text-xs text-slate-400 mt-1">
                {tavilySummary || 'PatchForge queried live web sources to eliminate pre-training cutoff hallucinations.'}
              </p>
            </div>

            {citations.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                No external search required; Tier 1 Nano resolved with high confidence.
              </div>
            ) : (
              citations.map((c, idx) => (
                <a
                  key={idx}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/50 rounded-xl transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-blue-400 flex items-center gap-1.5 transition-colors">
                      {c.title}
                      <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Relevance: {(c.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {c.snippet}
                  </p>
                  <span className="text-[11px] font-mono text-slate-500 mt-2 block truncate">
                    {c.url}
                  </span>
                </a>
              ))
            )}
          </div>
        )}

        {activeTab === 'plan' && refactoringPlan && (
          <div className="p-5 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
            {refactoringPlan}
          </div>
        )}
      </div>

      {prSuccessUrl && (
        <div className="p-3 bg-emerald-950/40 border-t border-emerald-800/50 flex items-center justify-between text-xs">
          <span className="text-emerald-300 font-medium flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Pull Request branch ready for review!
          </span>
          <a
            href={prSuccessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline font-bold flex items-center gap-1"
          >
            Open PR on GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
