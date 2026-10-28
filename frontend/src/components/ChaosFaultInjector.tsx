import React, { useState } from 'react';
import { Flame, Zap, Play, ShieldAlert } from 'lucide-react';
import { TopologyNode } from './DataFlowCanvas';

interface ChaosFaultInjectorProps {
  nodes: TopologyNode[];
  selectedNodeId: string;
  isHealing: boolean;
  onInjectFault: (nodeId: string, faultType: string, autoHeal: boolean) => void;
}

export const ChaosFaultInjector: React.FC<ChaosFaultInjectorProps> = ({
  nodes,
  selectedNodeId,
  isHealing,
  onInjectFault,
}) => {
  const [faultType, setFaultType] = useState<string>('breaking_schema');
  const targetNode = nodes.find((n) => n.id === selectedNodeId) || nodes[1] || nodes[0];

  if (!targetNode) return null;

  return (
    <div className="p-3 bg-gradient-to-b from-amber-950/20 to-[#0c0c0f] border-t border-zinc-800 space-y-2.5 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
            Interactive Chaos Fault Injector
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
          Target: {targetNode.file}
        </span>
      </div>

      <p className="text-[11px] text-zinc-400 leading-snug">
        Sabotage <strong className="text-zinc-200">{targetNode.function}</strong> live to shift the crash origin, recalculate the blast radius, and watch PatchForge heal it:
      </p>

      {/* Fault Type Selector */}
      <select
        value={faultType}
        onChange={(e) => setFaultType(e.target.value)}
        disabled={isHealing}
        className="w-full px-2.5 py-1.5 rounded-lg bg-[#09090b] border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
      >
        <option value="breaking_schema">1. Inject Breaking Schema / Deprecated API Call</option>
        <option value="malformed_contract">2. Inject Malformed Downstream Data Contract</option>
        <option value="unsafe_security">3. Inject Unsafe Security Deserialization / SQL Sink</option>
      </select>

      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <button
          type="button"
          disabled={isHealing}
          onClick={() => onInjectFault(targetNode.id, faultType, false)}
          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <ShieldAlert className="w-3 h-3" />
          Sabotage Node
        </button>

        <button
          type="button"
          disabled={isHealing}
          onClick={() => onInjectFault(targetNode.id, faultType, true)}
          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
        >
          <Play className="w-3 h-3 fill-current" />
          Sabotage & Heal
        </button>
      </div>
    </div>
  );
};
