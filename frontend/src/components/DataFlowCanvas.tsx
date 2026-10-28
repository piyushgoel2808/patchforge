import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Code2,
  Flame,
  Clock,
  ShieldCheck,
  Play,
  Layers,
  ChevronRight,
} from 'lucide-react';

export interface TopologyNode {
  id: string;
  file: string;
  function: string;
  layer: string;
  line_start: number;
  line_end: number;
  upstream_ids: string[];
  downstream_ids: string[];
  blast_radius_count: number;
  criticality_score: number;
  input_contract: string;
  output_contract: string;
  status: 'PASSED' | 'CRASHED' | 'STARVED' | 'HEALED';
  sabotaged?: boolean;
  fault_type?: string;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  data_label: string;
  status: 'ACTIVE_FLOW' | 'STARVED_FLOW' | 'HEALED_FLOW';
  schema_migrated?: boolean;
  before_contract?: string;
  after_contract?: string;
  sample_packet?: any;
}

interface DataFlowCanvasProps {
  repoName: string;
  domainType: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  selectedNodeId: string;
  activeReplayNodeId?: string;
  isHealing: boolean;
  currentAgentNode: string;
  viewState: 'broken' | 'healed';
  onToggleViewState: (mode: 'broken' | 'healed') => void;
  onSelectNode: (nodeId: string) => void;
  onInspectCode?: (filename: string) => void;
  onInjectFault?: (nodeId: string, faultType: string, autoHeal: boolean) => void;
  canShowHealed: boolean;
}

const FRIENDLY_LAYER: Record<string, string> = {
  ENTRYPOINT: '1. Entrypoint',
  SCHEMA_VALIDATOR: '2. Data Validator',
  CONTROLLER: '2. Service Controller',
  CORE_SERVICE: '3. Core Business Logic',
  STORAGE_ADAPTER: '4. Database / Output',
};

export const DataFlowCanvas: React.FC<DataFlowCanvasProps> = ({
  domainType,
  nodes,
  edges,
  selectedNodeId,
  isHealing,
  currentAgentNode,
  viewState,
  onToggleViewState,
  onSelectNode,
  onInspectCode,
  onInjectFault,
  canShowHealed,
}) => {
  const [faultType, setFaultType] = useState<string>('breaking_schema');

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[1] || nodes[0];

  const getEffectiveStatus = (
    node: TopologyNode
  ): 'PASSED' | 'CRASHED' | 'STARVED' | 'HEALED' => {
    if (viewState === 'healed' && canShowHealed) {
      return node.status === 'CRASHED' ? 'HEALED' : 'PASSED';
    }
    return node.status;
  };

  const getEffectiveEdgeStatus = (
    edge: TopologyEdge
  ): 'ACTIVE_FLOW' | 'STARVED_FLOW' | 'HEALED_FLOW' => {
    if (viewState === 'healed' && canShowHealed) {
      return edge.schema_migrated ? 'HEALED_FLOW' : 'ACTIVE_FLOW';
    }
    return edge.status;
  };

  const crashedCount = nodes.filter((n) => getEffectiveStatus(n) === 'CRASHED').length;
  const starvedCount = nodes.filter((n) => getEffectiveStatus(n) === 'STARVED').length;
  const migratedEdge = edges.find((e) => e.schema_migrated) || edges[0];

  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-[#0d0f17] shadow-2xl overflow-hidden">
      {/* Top Section Header */}
      <div className="px-6 py-4 bg-[#11141f] border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              System Architecture Map
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs font-medium text-zinc-400">{domainType}</span>
          </div>
          <h3 className="text-base font-semibold text-white mt-0.5">
            End-to-End Service Data Flow & Blast Radius
          </h3>
        </div>

        {/* Clean Before / After State Switcher */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center bg-[#090a0f] border border-zinc-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => onToggleViewState('broken')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                viewState === 'broken'
                  ? 'bg-red-500/15 text-red-300 border border-red-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Broken State ({crashedCount} Crash, {starvedCount} Blocked)
            </button>
            <button
              type="button"
              onClick={() => onToggleViewState('healed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                viewState === 'healed'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Healed State (100% Flowing)
            </button>
          </div>
        </div>
      </div>

      {/* Main 4-Stage Pipeline Flow Board */}
      <div className="p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 relative">
          {nodes.map((node, idx) => {
            const effStatus = getEffectiveStatus(node);
            const isSelected = node.id === selectedNodeId;
            const outgoingEdge = edges.find((e) => e.source === node.id);
            const friendlyLayer = FRIENDLY_LAYER[node.layer] || `Stage ${idx + 1}`;

            let borderClass = 'border-zinc-800 bg-[#121521] hover:border-zinc-700';
            let statusPill = (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                Healthy Stage
              </span>
            );

            if (effStatus === 'CRASHED') {
              borderClass =
                'border-red-500/70 bg-gradient-to-b from-red-950/30 to-[#121521] shadow-lg shadow-red-950/20';
              statusPill = (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  {node.sabotaged ? 'Fault Injected Here' : 'Execution Crash Point'}
                </span>
              );
            } else if (effStatus === 'STARVED') {
              borderClass = 'border-dashed border-amber-500/40 bg-[#0e1018]/90';
              statusPill = (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Blocked (Waiting on Stage {idx})
                </span>
              );
            } else if (effStatus === 'HEALED') {
              borderClass =
                'border-emerald-500/70 bg-gradient-to-b from-emerald-950/30 to-[#121521] shadow-lg shadow-emerald-950/20';
              statusPill = (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Patched & Verified
                </span>
              );
            }

            return (
              <div key={node.id} className="relative flex flex-col">
                <div
                  onClick={() => onSelectNode(node.id)}
                  className={`flex-1 rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between ${borderClass} ${
                    isSelected ? 'ring-2 ring-emerald-400 border-transparent' : ''
                  }`}
                >
                  <div>
                    {/* Stage Step & Layer */}
                    <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                      <span className="font-semibold text-zinc-300">{friendlyLayer}</span>
                      <span className="font-mono text-[11px] text-zinc-500">
                        Lines {node.line_start}–{node.line_end}
                      </span>
                    </div>

                    {/* File & Function */}
                    <div className="text-sm font-bold text-white font-mono">{node.file}</div>
                    <div className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
                      {node.function}()
                    </div>

                    {/* Status Badge */}
                    <div className="mt-4">{statusPill}</div>

                    {/* Plain-English Explanation */}
                    <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
                      {effStatus === 'CRASHED' ? (
                        <span className="text-red-200/90">
                          Throws an unhandled exception here, preventing{' '}
                          <strong>{node.blast_radius_count} downstream modules</strong> from receiving data.
                        </span>
                      ) : effStatus === 'STARVED' ? (
                        <span className="text-amber-200/80">
                          Healthy code, but receives <strong>0 requests</strong> because the upstream stage crashed.
                        </span>
                      ) : effStatus === 'HEALED' ? (
                        <span className="text-emerald-200/90">
                          Code automatically migrated by Nemotron Super 120B. Data now flows cleanly downstream.
                        </span>
                      ) : (
                        <span>
                          Processes incoming data contract and forwards validated output to the next stage.
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Connector indicator to next stage */}
                  {outgoingEdge && idx < nodes.length - 1 && (
                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-zinc-500">Passes:</span>
                      <span
                        className={`flex items-center gap-1 font-medium ${
                          getEffectiveEdgeStatus(outgoingEdge) === 'STARVED_FLOW'
                            ? 'text-zinc-500 line-through'
                            : 'text-emerald-400'
                        }`}
                      >
                        {outgoingEdge.data_label}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Stage Details & Interactive Chaos Testing Bar */}
        {selectedNode && (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-[#11141f]/95 p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left 7 cols: Stage Data Contract & Contract Migration Info */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-800 text-white">
                    Selected Stage: {selectedNode.file}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    ({selectedNode.function})
                  </span>
                </div>
                {onInspectCode && (
                  <button
                    type="button"
                    onClick={() => onInspectCode(selectedNode.file)}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5"
                  >
                    <Code2 className="w-4 h-4" />
                    Inspect File Source Code
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-[#090a0f] border border-zinc-800/80">
                  <span className="text-[10px] uppercase tracking-wider text-sky-400 font-semibold block mb-1">
                    Expected Input Contract
                  </span>
                  <span className="text-zinc-200">{selectedNode.input_contract}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#090a0f] border border-zinc-800/80">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold block mb-1">
                    Guaranteed Output Contract
                  </span>
                  <span className="text-zinc-200">{selectedNode.output_contract}</span>
                </div>
              </div>

              {migratedEdge && migratedEdge.before_contract !== migratedEdge.after_contract && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono pt-1">
                  <span className="text-zinc-400 flex items-center gap-1 font-sans font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Contract Upgrade:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-950/40 text-red-300 border border-red-800/40 line-through">
                    {migratedEdge.before_contract}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-700/50 font-semibold">
                    {migratedEdge.after_contract}
                  </span>
                </div>
              )}
            </div>

            {/* Right 5 cols: Interactive Chaos Fault Simulator */}
            {onInjectFault && (
              <div className="lg:col-span-5 p-4 rounded-xl bg-[#090a0f] border border-zinc-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Interactive Fault Simulator (Chaos Test)
                  </span>
                  <span className="text-[11px] text-zinc-500">Test Any Stage</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Simulate a breaking change in <strong>{selectedNode.file}</strong> to see how the blast radius shifts and watch PatchForge heal it:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={faultType}
                    onChange={(e) => setFaultType(e.target.value)}
                    disabled={isHealing}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#121521] border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="breaking_schema">Deprecated API / Schema Change</option>
                    <option value="malformed_contract">Corrupted Return Data Contract</option>
                    <option value="unsafe_security">Security CVE / Injection Flaw</option>
                  </select>
                  <button
                    type="button"
                    disabled={isHealing}
                    onClick={() => onInjectFault(selectedNode.id, faultType, false)}
                    className="px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition whitespace-nowrap disabled:opacity-50"
                  >
                    Simulate Fault
                  </button>
                  <button
                    type="button"
                    disabled={isHealing}
                    onClick={() => onInjectFault(selectedNode.id, faultType, true)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Heal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
