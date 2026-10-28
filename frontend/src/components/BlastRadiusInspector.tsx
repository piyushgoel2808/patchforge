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
} from 'lucide-react';
import { TopologyNode } from './DataFlowCanvas';

interface BlastRadiusInspectorProps {
  selectedNode?: TopologyNode;
  allNodes: TopologyNode[];
  isHealed: boolean;
  triageData?: any;
  refactoringPlan?: string;
  onSelectNode: (id: string) => void;
  onOpenCodeFile?: (filename: string) => void;
}

export const BlastRadiusInspector: React.FC<BlastRadiusInspectorProps> = ({
  selectedNode,
  allNodes,
  isHealed,
  triageData,
  refactoringPlan,
  onSelectNode,
  onOpenCodeFile,
}) => {
  if (!selectedNode) {
    return (
      <div className="p-4 text-xs text-zinc-500 font-mono">
        Click any node on the Data-Flow Canvas to inspect its blast radius and data contracts.
      </div>
    );
  }

  const upstreamNodes = allNodes.filter((n) => selectedNode.upstream_ids.includes(n.id));
  const downstreamNodes = allNodes.filter((n) => selectedNode.downstream_ids.includes(n.id));
  const totalPipelinePct = Math.round(
    (selectedNode.blast_radius_count / Math.max(allNodes.length - 1, 1)) * 100
  );

  return (
    <div className="flex flex-col h-full bg-[#0c0c0f] overflow-y-auto p-3 space-y-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
            Blast-Radius & Contract Inspector
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
          {selectedNode.layer}
        </span>
      </div>

      {/* Selected Node Summary Card */}
      <div className="p-2.5 rounded-lg bg-[#121217] border border-zinc-800 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            {selectedNode.file}
          </span>
          {onOpenCodeFile && (
            <button
              onClick={() => onOpenCodeFile(selectedNode.file)}
              className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              Inspect Source <ExternalLink className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <div className="text-[11px] font-mono text-zinc-400">
          Function: <span className="text-zinc-200">{selectedNode.function}</span> (L
          {selectedNode.line_start}–L{selectedNode.line_end})
        </div>

        {/* Impact KPI Row */}
        <div className="grid grid-cols-2 gap-2 pt-1.5">
          <div className="p-2 rounded bg-[#09090b] border border-zinc-800/80">
            <span className="text-[9px] font-mono text-zinc-500 uppercase block">
              Downstream At Risk
            </span>
            <span className="text-xs font-bold font-mono text-amber-400">
              {selectedNode.blast_radius_count} modules ({totalPipelinePct}% pipeline)
            </span>
          </div>
          <div className="p-2 rounded bg-[#09090b] border border-zinc-800/80">
            <span className="text-[9px] font-mono text-zinc-500 uppercase block">
              Contract Status
            </span>
            <span
              className={`text-xs font-bold font-mono flex items-center gap-1 ${
                isHealed ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isHealed ? (
                <>
                  <CheckCircle2 className="w-3 h-3" /> Ultra Verified
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" /> Drift / Broken
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Data Contract Card (Incoming & Outgoing) */}
      <div className="p-2.5 rounded-lg bg-[#121217] border border-zinc-800 space-y-2 font-mono text-[11px]">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-sky-400 font-bold block">
            Incoming Data Contract (Input)
          </span>
          <div className="mt-0.5 px-2 py-1 rounded bg-[#09090b] border border-zinc-800 text-zinc-200 break-words">
            {selectedNode.input_contract}
          </div>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block">
            Outgoing Data Contract (Output)
          </span>
          <div className="mt-0.5 px-2 py-1 rounded bg-[#09090b] border border-zinc-800 text-zinc-200 break-words">
            {selectedNode.output_contract}
          </div>
        </div>
      </div>

      {/* Upstream Callers & Downstream Dependents */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-[#121217] border border-zinc-800 space-y-1">
          <span className="text-[9px] font-mono uppercase text-sky-400 font-bold flex items-center gap-1">
            <ArrowUpLeft className="w-3 h-3" /> Upstream Callers ({upstreamNodes.length})
          </span>
          {upstreamNodes.length === 0 ? (
            <span className="text-[10px] font-mono text-zinc-500 block">Root Entrypoint</span>
          ) : (
            upstreamNodes.map((u) => (
              <button
                key={u.id}
                onClick={() => onSelectNode(u.id)}
                className="w-full text-left px-1.5 py-1 rounded bg-sky-950/30 hover:bg-sky-950/50 border border-sky-800/40 text-[10px] font-mono text-sky-300 truncate"
              >
                {u.file}::{u.function}
              </button>
            ))
          )}
        </div>

        <div className="p-2 rounded-lg bg-[#121217] border border-zinc-800 space-y-1">
          <span className="text-[9px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" /> Downstream ({downstreamNodes.length})
          </span>
          {downstreamNodes.length === 0 ? (
            <span className="text-[10px] font-mono text-zinc-500 block">Terminal Sink</span>
          ) : (
            downstreamNodes.map((d) => (
              <button
                key={d.id}
                onClick={() => onSelectNode(d.id)}
                className="w-full text-left px-1.5 py-1 rounded bg-amber-950/30 hover:bg-amber-950/50 border border-amber-800/40 text-[10px] font-mono text-amber-300 truncate"
              >
                {d.file}::{d.function}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Nano 30B Triage & Ultra 550B Blast-Radius Plan */}
      {triageData && (
        <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
            <Cpu className="w-3.5 h-3.5" />
            Nemotron 3 Nano Triage Diagnosis
          </div>
          <p className="text-[11px] text-zinc-300 leading-snug">{triageData.root_cause}</p>
        </div>
      )}

      {refactoringPlan && (
        <div className="p-2.5 rounded-lg bg-purple-950/20 border border-purple-800/40 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-300">
            <Brain className="w-3.5 h-3.5" />
            Ultra 550B Blast-Radius Preservation Plan
          </div>
          <div className="text-[10px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
            {refactoringPlan}
          </div>
        </div>
      )}
    </div>
  );
};
