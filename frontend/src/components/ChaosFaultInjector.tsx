import React, { useState } from 'react';
import { Flame, Play, ShieldAlert } from 'lucide-react';
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
    <div className="p-2.5 pf-surface space-y-1.5 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider pf-text">
            Interactive Chaos Fault Injector
          </span>
        </div>
        <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold">
          Target: {targetNode.file}
        </span>
      </div>

      <p className="text-[11px] pf-muted leading-tight">
        Sabotage <strong className="pf-text">{targetNode.function}()</strong> live to shift the red crash explosion on the graph, recalculate the blast radius, and watch PatchForge heal it:
      </p>

      <select
        value={faultType}
        onChange={(e) => setFaultType(e.target.value)}
        disabled={isHealing}
        className="w-full px-2.5 py-1 rounded-xl pf-card border pf-border text-[11px] font-mono pf-text focus:outline-none"
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
          className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-700 dark:text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Inject Live Fault
        </button>

        <button
          type="button"
          disabled={isHealing}
          onClick={() => onInjectFault(targetNode.id, faultType, true)}
          className="px-3 py-1.5 rounded-xl pf-accent-bg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Inject & Auto-Heal
        </button>
      </div>
    </div>
  );
};
