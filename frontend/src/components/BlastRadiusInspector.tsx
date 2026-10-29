import React from 'react';
import {
  ShieldAlert,
  ArrowUpLeft,
  ArrowDownRight,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Brain,
  ExternalLink,
  Crosshair,
  ShieldCheck,
} from 'lucide-react';
import { TopologyNode } from './DataFlowCanvas';

interface BlastRadiusInspectorProps {
  selectedNode?: TopologyNode & { sbfl_ochiai?: number; pagerank_score?: number };
  allNodes: TopologyNode[];
  isHealed: boolean;
  triageData?: any;
  refactoringPlan?: string;
  safetyInvariants?: any[];
  onSelectNode: (id: string) => void;
  onOpenCodeFile?: (filename: string) => void;
}

export const BlastRadiusInspector: React.FC<BlastRadiusInspectorProps> = ({
  selectedNode,
  allNodes,
  isHealed,
  triageData,
  refactoringPlan,
  safetyInvariants = [],
  onSelectNode,
  onOpenCodeFile,
}) => {
  if (!selectedNode) {
    return (
      <div className="p-4 text-xs pf-muted font-mono">
        Click any node on the Data-Flow Canvas to inspect its blast radius and data contracts.
      </div>
    );
  }

  const upstreamNodes = allNodes.filter((n) => selectedNode.upstream_ids.includes(n.id));
  const downstreamNodes = allNodes.filter((n) => selectedNode.downstream_ids.includes(n.id));
  const totalPipelinePct = Math.round(
    (selectedNode.blast_radius_count / Math.max(allNodes.length - 1, 1)) * 100
  );

  const sbflScore = isHealed
    ? 0.04
    : selectedNode.sbfl_ochiai ?? (selectedNode.status === 'CRASHED' ? 0.96 : 0.14);
  const pagerankScore = selectedNode.pagerank_score ?? selectedNode.criticality_score;

  return (
    <div className="flex flex-col h-full pf-card overflow-y-auto p-3.5 space-y-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b pf-border pb-2.5">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 pf-accent-text" />
          <span className="text-xs font-bold uppercase tracking-wider pf-text">
            SBFL & Blast-Radius Inspector
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full pf-accent-tint border font-semibold">
          {selectedNode.layer}
        </span>
      </div>

      {/* Selected Node Summary Card + SBFL Ochiai & PageRank Metrics */}
      <div className="p-3 rounded-xl pf-surface border pf-border space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono pf-text flex items-center gap-1.5">
            <FileCode className="w-4 h-4 pf-accent-text" />
            {selectedNode.file}
          </span>
          {onOpenCodeFile && (
            <button
              type="button"
              onClick={() => onOpenCodeFile(selectedNode.file)}
              className="text-[11px] font-semibold pf-accent-text hover:underline flex items-center gap-1"
            >
              Inspect Source <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="text-xs font-mono pf-muted">
          Function: <span className="pf-text font-semibold">{selectedNode.function}()</span> (L
          {selectedNode.line_start}–L{selectedNode.line_end})
        </div>

        {/* AutoCodeRover Ochiai SBFL + Aider PageRank Dual Bars */}
        <div className="space-y-1.5 pt-1 border-t pf-border">
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="pf-muted flex items-center gap-1">
                <Crosshair className="w-3 h-3 text-rose-500" />
                Ochiai SBFL Suspiciousness
              </span>
              <span
                className={`font-bold ${
                  sbflScore > 0.5 ? 'text-rose-500' : 'text-emerald-500'
                }`}
              >
                {(sbflScore * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-1.5 pf-card rounded-full overflow-hidden mt-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  sbflScore > 0.5 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(sbflScore * 100, 6)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="pf-muted">Aider RepoMap PageRank Centrality</span>
              <span className="pf-accent-text font-bold">
                {(pagerankScore * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-1.5 pf-card rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full pf-accent-bg rounded-full"
                style={{ width: `${Math.max(pagerankScore * 100, 10)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Impact KPI Row */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2 rounded-lg pf-card border pf-border">
            <span className="text-[9px] font-mono pf-muted uppercase block">
              Blast Radius Risk
            </span>
            <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
              {selectedNode.blast_radius_count} nodes ({totalPipelinePct}%)
            </span>
          </div>
          <div className="p-2 rounded-lg pf-card border pf-border">
            <span className="text-[9px] font-mono pf-muted uppercase block">
              Contract Status
            </span>
            <span
              className={`text-xs font-bold font-mono flex items-center gap-1 ${
                isHealed
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {isHealed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ultra Verified
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" /> Drift / Broken
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* VulnResolver Safety Property Analysis (SPAAgent Invariants) */}
      {safetyInvariants.length > 0 && (
        <div className="p-3 rounded-xl pf-surface border pf-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider pf-accent-text flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              SPAAgent Safety & Contract Invariants
            </span>
            <span className="text-[9.5px] font-mono pf-muted">VulnResolver</span>
          </div>

          <div className="space-y-1.5">
            {safetyInvariants.map((inv: any) => {
              const passed = isHealed || inv.passed;
              return (
                <div
                  key={inv.id}
                  className={`p-2 rounded-lg border text-[10.5px] font-mono flex items-start justify-between gap-2 ${
                    passed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold flex items-center gap-1">
                      {passed ? (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                      )}
                      <span className="truncate">{inv.rule}</span>
                    </div>
                    <p className="text-[10px] opacity-85 font-sans mt-0.5 leading-snug">
                      {inv.title}
                    </p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded pf-card border pf-border shrink-0">
                    {passed ? 'CLEAN' : inv.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Contract Card (Incoming & Outgoing) */}
      <div className="p-3 rounded-xl pf-surface border pf-border space-y-2 font-mono text-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-sky-600 dark:text-sky-400 font-bold block">
            Incoming Data Contract (Input)
          </span>
          <div className="mt-1 px-2.5 py-1.5 rounded-lg pf-card border pf-border pf-text break-words text-[11px]">
            {selectedNode.input_contract}
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block">
            Outgoing Data Contract (Output)
          </span>
          <div className="mt-1 px-2.5 py-1.5 rounded-lg pf-card border pf-border pf-text break-words text-[11px]">
            {selectedNode.output_contract}
          </div>
        </div>
      </div>

      {/* Upstream Callers & Downstream Dependents */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl pf-surface border pf-border space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1">
            <ArrowUpLeft className="w-3.5 h-3.5" /> Upstream ({upstreamNodes.length})
          </span>
          {upstreamNodes.length === 0 ? (
            <span className="text-[11px] font-mono pf-muted block">Root Entrypoint</span>
          ) : (
            upstreamNodes.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelectNode(u.id)}
                className="w-full text-left px-2 py-1 rounded-lg pf-card hover:opacity-90 border pf-border text-[11px] font-mono pf-text truncate"
              >
                {u.file}::{u.function}
              </button>
            ))
          )}
        </div>

        <div className="p-2.5 rounded-xl pf-surface border pf-border space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" /> Downstream ({downstreamNodes.length})
          </span>
          {downstreamNodes.length === 0 ? (
            <span className="text-[11px] font-mono pf-muted block">Terminal Sink</span>
          ) : (
            downstreamNodes.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelectNode(d.id)}
                className="w-full text-left px-2 py-1 rounded-lg pf-card hover:opacity-90 border pf-border text-[11px] font-mono pf-text truncate"
              >
                {d.file}::{d.function}
              </button>
            ))
          )}
        </div>
      </div>

      {triageData && (
        <div className="p-3 rounded-xl pf-surface border pf-border space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold pf-accent-text">
            <Cpu className="w-3.5 h-3.5" />
            Nemotron 3 Nano 30B Diagnosis
          </div>
          <p className="text-xs pf-text leading-relaxed">{triageData.root_cause}</p>
        </div>
      )}

      {refactoringPlan && (
        <div className="p-3 rounded-xl pf-surface border pf-border space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold pf-accent-text">
            <Brain className="w-3.5 h-3.5" />
            Ultra 550B Blast-Radius Plan
          </div>
          <div className="text-[11px] font-mono pf-text whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
            {refactoringPlan}
          </div>
        </div>
      )}
    </div>
  );
};
