import React, { useState } from 'react';
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
  Flame,
  Play,
} from 'lucide-react';
import { TopologyNode } from './DataFlowCanvas';

interface BlastRadiusInspectorProps {
  selectedNode?: TopologyNode;
  allNodes: TopologyNode[];
  isHealed: boolean;
  isHealing: boolean;
  triageData?: any;
  refactoringPlan?: string;
  onSelectNode: (id: string) => void;
  onOpenCodeFile?: (filename: string) => void;
  onInjectFault: (nodeId: string, faultType: string, autoHeal: boolean) => void;
}

export const BlastRadiusInspector: React.FC<BlastRadiusInspectorProps> = ({
  selectedNode,
  allNodes,
  isHealed,
  isHealing,
  triageData,
  refactoringPlan,
  onSelectNode,
  onOpenCodeFile,
  onInjectFault,
}) => {
  const [faultType, setFaultType] = useState<string>('breaking_schema');

  if (!selectedNode) {
    return (
      <div className="p-4 text-xs text-zinc-500 font-mono">
        Click any stage card on the canvas to inspect its blast radius and data contracts.
      </div>
    );
  }

  const upstreamNodes = allNodes.filter((n) => selectedNode.upstream_ids.includes(n.id));
  const downstreamNodes = allNodes.filter((n) => selectedNode.downstream_ids.includes(n.id));
  const totalPipelinePct = Math.round(
    (selectedNode.blast_radius_count / Math.max(allNodes.length - 1, 1)) * 100
  );

  return (
    <div className="flex flex-col h-full bg-[#0c0c0f] overflow-y-auto p-3.5 space-y-3.5 select-none">
      {/* 1. Selected Stage Card Header */}
      <div className="p-3 rounded-xl bg-[#12131a] border border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-emerald-400" />
            {selectedNode.file}
          </span>
          {onOpenCodeFile && (
            <button
              onClick={() => onOpenCodeFile(selectedNode.file)}
              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-emerald-400 flex items-center gap-1 transition"
            >
              View Code <ExternalLink className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <div className="text-[11px] font-mono text-zinc-400">
          Function: <span className="text-zinc-100 font-semibold">{selectedNode.function}</span>
        </div>

        {/* Visual Blast-Radius Meter */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-zinc-400 uppercase">Downstream Blast Radius</span>
            <span className="text-amber-400 font-bold">
              {selectedNode.blast_radius_count} downstream stages ({totalPipelinePct}% of pipeline)
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              className={`h-full rounded-full transition-all ${
                isHealed ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.max(totalPipelinePct, 12)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
            <span className="text-zinc-500">Contract Compatibility:</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                isHealed ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isHealed ? (
                <>
                  <CheckCircle2 className="w-3 h-3" /> Preserved by Ultra 550B
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" /> Broken / Unverified
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Input & Output Data Contracts */}
      <div className="p-3 rounded-xl bg-[#12131a] border border-zinc-800 space-y-2.5 font-mono text-[11px]">
        <div>
          <span className="text-[9.5px] uppercase tracking-wider text-sky-400 font-bold block">
            Incoming Payload Contract (Expected Input)
          </span>
          <div className="mt-1 px-2.5 py-1.5 rounded-lg bg-[#09090b] border border-zinc-800/90 text-zinc-200 break-words">
            {selectedNode.input_contract}
          </div>
        </div>
        <div>
          <span className="text-[9.5px] uppercase tracking-wider text-emerald-400 font-bold block">
            Outgoing Return Contract (Guaranteed Output)
          </span>
          <div className="mt-1 px-2.5 py-1.5 rounded-lg bg-[#09090b] border border-zinc-800/90 text-zinc-200 break-words">
            {selectedNode.output_contract}
          </div>
        </div>
      </div>

      {/* 3. Connected Upstream & Downstream Stages */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl bg-[#12131a] border border-zinc-800 space-y-1.5">
          <span className="text-[9.5px] font-mono uppercase text-sky-400 font-bold flex items-center gap-1">
            <ArrowUpLeft className="w-3 h-3" /> Receives From ({upstreamNodes.length})
          </span>
          {upstreamNodes.length === 0 ? (
            <span className="text-[10px] font-mono text-zinc-500 block">Entrypoint Trigger</span>
          ) : (
            upstreamNodes.map((u) => (
              <button
                key={u.id}
                onClick={() => onSelectNode(u.id)}
                className="w-full text-left px-2 py-1 rounded bg-sky-950/30 hover:bg-sky-950/50 border border-sky-800/40 text-[10px] font-mono text-sky-300 truncate"
              >
                {u.file}
              </button>
            ))
          )}
        </div>

        <div className="p-2.5 rounded-xl bg-[#12131a] border border-zinc-800 space-y-1.5">
          <span className="text-[9.5px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3" /> Feeds Into ({downstreamNodes.length})
          </span>
          {downstreamNodes.length === 0 ? (
            <span className="text-[10px] font-mono text-zinc-500 block">Final Pipeline Output</span>
          ) : (
            downstreamNodes.map((d) => (
              <button
                key={d.id}
                onClick={() => onSelectNode(d.id)}
                className="w-full text-left px-2 py-1 rounded bg-amber-950/30 hover:bg-amber-950/50 border border-amber-800/40 text-[10px] font-mono text-amber-300 truncate"
              >
                {d.file}
              </button>
            ))
          )}
        </div>
      </div>

      {/* 4. Interactive Chaos Fault Lab (Integrated cleanly into the Inspector) */}
      <div className="p-3 rounded-xl bg-gradient-to-b from-amber-950/25 to-[#12131a] border border-amber-500/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Interactive Chaos Fault Lab
          </span>
          <span className="text-[9.5px] font-mono text-amber-400/90">Test Live Resilience</span>
        </div>

        <p className="text-[11px] text-zinc-300 leading-snug">
          Intentionally break <strong>{selectedNode.file}</strong> with a custom fault to watch the blast radius shift and test autonomous self-healing:
        </p>

        <select
          value={faultType}
          onChange={(e) => setFaultType(e.target.value)}
          disabled={isHealing}
          className="w-full px-2.5 py-1.5 rounded-lg bg-[#09090b] border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
        >
          <option value="breaking_schema">1. Inject Deprecated v1 Schema / API Call</option>
          <option value="malformed_contract">2. Corrupt Outgoing Data Contract Keys</option>
          <option value="unsafe_security">3. Inject Unsafe YAML / SQLi Vulnerability</option>
        </select>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isHealing}
            onClick={() => onInjectFault(selectedNode.id, faultType, false)}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <ShieldAlert className="w-3 h-3" />
            Break This Stage
          </button>

          <button
            type="button"
            disabled={isHealing}
            onClick={() => onInjectFault(selectedNode.id, faultType, true)}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-current" />
            Break & Auto-Heal
          </button>
        </div>
      </div>

      {/* 5. AI Diagnosis & Plan Summary (if available) */}
      {triageData && (
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
            <Cpu className="w-3.5 h-3.5" />
            Nemotron 3 Nano 30B Diagnosis
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">{triageData.root_cause}</p>
        </div>
      )}

      {refactoringPlan && (
        <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-300">
            <Brain className="w-3.5 h-3.5" />
            Ultra 550B Blast-Radius Plan
          </div>
          <div className="text-[10.5px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {refactoringPlan}
          </div>
        </div>
      )}
    </div>
  );
};
