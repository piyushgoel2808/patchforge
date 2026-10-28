import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Sparkles,
  Activity,
  ArrowRight,
  Layers,
  Flame,
  Code2,
  PauseCircle,
  ShieldCheck,
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
  onQuickChaosHeal?: (nodeId: string) => void;
  canShowHealed: boolean;
}

const LAYER_LABELS: Record<string, { label: string; color: string }> = {
  ENTRYPOINT: { label: 'STAGE 1 • ENTRYPOINT', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  SCHEMA_VALIDATOR: {
    label: 'STAGE 2 • VALIDATOR / SCHEMA',
    color: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
  },
  CONTROLLER: {
    label: 'STAGE 2 • CONTROLLER / POOL',
    color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
  },
  CORE_SERVICE: {
    label: 'STAGE 3 • CORE LOGIC',
    color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
  },
  STORAGE_ADAPTER: {
    label: 'STAGE 4 • OUTPUT / STORAGE',
    color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  },
};

export const DataFlowCanvas: React.FC<DataFlowCanvasProps> = ({
  repoName,
  domainType,
  nodes,
  edges,
  selectedNodeId,
  activeReplayNodeId,
  isHealing,
  currentAgentNode,
  viewState,
  onToggleViewState,
  onSelectNode,
  onInspectCode,
  onQuickChaosHeal,
  canShowHealed,
}) => {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const activeEdge =
    edges.find((e) => e.id === selectedEdgeId) ||
    edges.find((e) => e.schema_migrated) ||
    edges[0];

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

  const agentScannerLabel = () => {
    if (!isHealing) return '';
    if (currentAgentNode === 'triage_with_nano') return 'Tier 1: Nano 30B Triaging Crash Node...';
    if (currentAgentNode === 'ground_with_tavily') return 'Tier 2: Tavily Fetching Live Docs...';
    if (currentAgentNode === 'plan_with_ultra') return 'Tier 3: Ultra 550B Planning Safe Fix...';
    if (currentAgentNode === 'synthesize_patch_with_super') return 'Tier 4: Super 120B Patching Code...';
    if (currentAgentNode === 'verify_patch_in_sandbox') return 'Sandbox Re-Verifying Full Pipeline...';
    return 'Tracing Live Repository Execution...';
  };

  const crashedCount = nodes.filter((n) => getEffectiveStatus(n) === 'CRASHED').length;
  const starvedCount = nodes.filter((n) => getEffectiveStatus(n) === 'STARVED').length;

  return (
    <div className="flex flex-col h-full bg-[#09090b] relative overflow-hidden select-none">
      {/* 1. Clean Top Canvas Bar */}
      <div className="h-11 px-4 bg-[#111115] border-b border-zinc-800/90 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Layers className="w-3 h-3" />
            ARCHITECTURE DATA-FLOW X-RAY
          </span>
          <h2 className="text-xs font-bold text-white tracking-tight">
            {domainType || repoName}
          </h2>

          {/* Plain-English Pipeline Status Summary Pill */}
          {viewState === 'healed' ? (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              All {nodes.length} Stages Flowing Cleanly (100% Tests Passing)
            </span>
          ) : (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-300 border border-red-500/30">
              <AlertOctagon className="w-3 h-3 text-red-400" />
              {crashedCount} Crash Origin • {starvedCount} Downstream Stages Blocked
            </span>
          )}
        </div>

        {/* Right: Single Master Mode Switch (Syncs both Canvas & Debugger) */}
        <div className="flex items-center gap-2">
          {isHealing && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-purple-500/20 text-purple-200 border border-purple-500/40 animate-pulse">
              <Activity className="w-3 h-3 animate-spin text-purple-400" />
              {agentScannerLabel()}
            </span>
          )}

          <div className="flex items-center bg-[#09090b] border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => onToggleViewState('broken')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1.5 ${
                viewState === 'broken'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <AlertOctagon className="w-3 h-3 text-red-400" />
              1. Broken State (Before)
            </button>
            <button
              onClick={() => onToggleViewState('healed')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1.5 ${
                viewState === 'healed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              2. Healed State (After)
            </button>
          </div>
        </div>
      </div>

      {/* 2. Spacious Interactive Stage Cards + Animated SVG Data Conduits (Zero Overlap!) */}
      <div className="flex-1 px-4 py-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] flex flex-col justify-between overflow-x-auto overflow-y-auto">
        <div className="flex items-stretch justify-between gap-1 min-w-[760px] my-auto">
          {nodes.map((node, idx) => {
            const effStatus = getEffectiveStatus(node);
            const isSelected = node.id === selectedNodeId;
            const isReplayActive = node.id === activeReplayNodeId;
            const outgoingEdge = edges.find((e) => e.source === node.id);
            const layerMeta = LAYER_LABELS[node.layer] || {
              label: `STAGE ${idx + 1} • ${node.layer}`,
              color: 'text-zinc-300 bg-zinc-800 border-zinc-700',
            };

            let cardStyle =
              'bg-[#11131a]/95 border-zinc-800 hover:border-zinc-700 text-zinc-200';
            let statusBadge = (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                <CheckCircle2 className="w-3 h-3 text-sky-400" /> PASSING STAGE
              </span>
            );

            if (effStatus === 'CRASHED') {
              cardStyle =
                'bg-gradient-to-b from-red-950/40 to-[#140c0e] border-red-500/80 shadow-lg shadow-red-500/10';
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                  <AlertOctagon className="w-3 h-3 text-red-400" />
                  {node.sabotaged ? 'SABOTAGED CRASH' : 'CRASH ORIGIN'}
                </span>
              );
            } else if (effStatus === 'STARVED') {
              cardStyle =
                'bg-[#0d0d11]/80 border-dashed border-amber-500/40 opacity-85';
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <PauseCircle className="w-3 h-3 text-amber-400" /> BLOCKED (0 Payloads)
                </span>
              );
            } else if (effStatus === 'HEALED') {
              cardStyle =
                'bg-gradient-to-b from-emerald-950/35 to-[#0c1613] border-emerald-500/80 shadow-lg shadow-emerald-500/10';
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> HEALED & VERIFIED
                </span>
              );
            }

            return (
              <React.Fragment key={node.id}>
                {/* Stage Card */}
                <div
                  onClick={() => onSelectNode(node.id)}
                  className={`flex-1 min-w-[168px] max-w-[235px] rounded-xl border-2 p-3 transition-all cursor-pointer flex flex-col justify-between relative ${cardStyle} ${
                    isSelected
                      ? 'ring-2 ring-white border-white shadow-xl scale-[1.01]'
                      : isReplayActive
                      ? 'ring-2 ring-cyan-400/70'
                      : ''
                  }`}
                >
                  {/* Active AI Scanner Overlay Badge during Healing */}
                  {isHealing && node.status === 'CRASHED' && (
                    <div className=" -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-mono font-bold shadow flex items-center gap-1 whitespace-nowrap">
                      <Activity className="w-2.5 h-2.5 animate-spin" /> AI Patching...
                    </div>
                  )}

                  <div>
                    {/* Top Row: Stage Layer & Step Number */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border truncate ${layerMeta.color}`}
                      >
                        STAGE {idx + 1} • {node.layer.replace('_', ' ')}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                        L{node.line_start}–{node.line_end}
                      </span>
                    </div>

                    {/* File & Function Name */}
                    <div className="font-mono font-bold text-xs text-white truncate">
                      {node.file}
                    </div>
                    <div
                      className="font-mono text-[11px] text-zinc-300 truncate mt-0.5"
                      title={node.function}
                    >
                      fn: <span className="text-emerald-300">{node.function}</span>
                    </div>

                    {/* Status Pill */}
                    <div className="mt-2.5">{statusBadge}</div>

                    {/* Plain-English Impact Explanation */}
                    <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400 leading-snug">
                      {effStatus === 'CRASHED' ? (
                        <span className="text-red-300">
                          Halts pipeline here — starves{' '}
                          <strong>{node.blast_radius_count} downstream stages</strong>.
                        </span>
                      ) : effStatus === 'STARVED' ? (
                        <span className="text-amber-200/80">
                          Waiting for upstream crash to be resolved before executing.
                        </span>
                      ) : effStatus === 'HEALED' ? (
                        <span className="text-emerald-300">
                          Patched by Nemotron Super 120B; contract verified!
                        </span>
                      ) : (
                        <span>
                          Processes payload & forwards to{' '}
                          {node.downstream_ids.length > 0 ? `Stage ${idx + 2}` : 'final output'}.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interactive Card Footer Actions */}
                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1.5">
                    {onInspectCode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectCode(node.file);
                        }}
                        className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 text-[10px] font-mono flex items-center gap-1 transition"
                        title="Open file in Code & Diff viewer"
                      >
                        <Code2 className="w-3 h-3 text-sky-400" />
                        Code
                      </button>
                    )}

                    {onQuickChaosHeal && effStatus !== 'CRASHED' && (
                      <button
                        type="button"
                        disabled={isHealing}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickChaosHeal(node.id);
                        }}
                        className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-semibold flex items-center gap-1 transition disabled:opacity-40"
                        title="Inject a live Chaos fault into this stage"
                      >
                        <Flame className="w-3 h-3 text-amber-400" />
                        Break Stage
                      </button>
                    )}
                  </div>
                </div>

                {/* Animated SVG Data-Packet Conduit Between Cards (Never Overlaps!) */}
                {outgoingEdge && idx < nodes.length - 1 && (
                  <div
                    onClick={() => setSelectedEdgeId(outgoingEdge.id)}
                    onMouseEnter={() => setSelectedEdgeId(outgoingEdge.id)}
                    className="w-24 shrink-0 flex flex-col items-center justify-center px-1 cursor-pointer group"
                    title="Click to inspect live wire packet & contract migration"
                  >
                    {/* Wire Label Pill Above Arrow */}
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border mb-1 truncate max-w-[92px] transition ${
                        outgoingEdge.schema_migrated && viewState === 'healed'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : getEffectiveEdgeStatus(outgoingEdge) === 'STARVED_FLOW'
                          ? 'bg-zinc-900 text-zinc-500 border-zinc-800'
                          : 'bg-sky-500/10 text-sky-300 border-sky-500/30 group-hover:border-sky-400'
                      }`}
                    >
                      {outgoingEdge.schema_migrated && viewState === 'healed'
                        ? '✨ Migrated'
                        : outgoingEdge.data_label}
                    </span>

                    {/* Animated SVG Conduit */}
                    <svg viewBox="0 0 80 28" className="w-full h-7 overflow-visible">
                      <path
                        d="M 2 14 L 74 14"
                        fill="none"
                        stroke={
                          getEffectiveEdgeStatus(outgoingEdge) === 'HEALED_FLOW'
                            ? '#10b981'
                            : getEffectiveEdgeStatus(outgoingEdge) === 'ACTIVE_FLOW'
                            ? '#38bdf8'
                            : '#52525b'
                        }
                        strokeWidth="2.5"
                        strokeDasharray={
                          getEffectiveEdgeStatus(outgoingEdge) === 'STARVED_FLOW'
                            ? '4 4'
                            : 'none'
                        }
                      />
                      {/* Arrowhead */}
                      <polygon
                        points="78,14 70,9 70,19"
                        fill={
                          getEffectiveEdgeStatus(outgoingEdge) === 'HEALED_FLOW'
                            ? '#10b981'
                            : getEffectiveEdgeStatus(outgoingEdge) === 'ACTIVE_FLOW'
                            ? '#38bdf8'
                            : '#52525b'
                        }
                      />

                      {/* Flowing Data Particles when Active or Healed */}
                      {getEffectiveEdgeStatus(outgoingEdge) !== 'STARVED_FLOW' ? (
                        <>
                          <circle
                            r="4"
                            fill={
                              getEffectiveEdgeStatus(outgoingEdge) === 'HEALED_FLOW'
                                ? '#34d399'
                                : '#38bdf8'
                            }
                          >
                            <animateMotion
                              dur="1.2s"
                              repeatCount="indefinite"
                              path="M 2 14 L 74 14"
                            />
                          </circle>
                          <circle r="2.5" fill="#ffffff">
                            <animateMotion
                              dur="1.2s"
                              begin="0.6s"
                              repeatCount="indefinite"
                              path="M 2 14 L 74 14"
                            />
                          </circle>
                        </>
                      ) : (
                        <text
                          x="40"
                          y="18"
                          textAnchor="middle"
                          fill="#ef4444"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          ✕
                        </text>
                      )}
                    </svg>

                    <span className="text-[8.5px] font-mono text-zinc-500 group-hover:text-zinc-300 mt-0.5">
                      {getEffectiveEdgeStatus(outgoingEdge) === 'STARVED_FLOW'
                        ? '0 packets'
                        : 'Inspect wire'}
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 3. Interactive Wire Contract & Schema Drift Bar (Bottom of Canvas) */}
        {activeEdge && (
          <div className="mt-2 px-3 py-2 rounded-xl bg-[#11131a] border border-zinc-800/90 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-bold">
                WIRE DATA CONTRACT
              </span>
              <span className="text-zinc-200 font-semibold text-[11px]">
                {activeEdge.source.split('::')[0]}{' '}
                <ArrowRight className="inline w-3 h-3 text-zinc-500 mx-0.5" />{' '}
                {activeEdge.target.split('::')[0]}
              </span>
              {activeEdge.schema_migrated && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Contract Upgraded by PatchForge
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              {activeEdge.before_contract !== activeEdge.after_contract ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-red-950/40 text-red-300 border border-red-800/40 line-through">
                    {activeEdge.before_contract}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-700/50 font-bold">
                    {activeEdge.after_contract}
                  </span>
                </div>
              ) : (
                <span className="text-zinc-400 text-[10.5px]">
                  Sample Packet: <code className="text-sky-300">{JSON.stringify(activeEdge.sample_packet || {})}</code>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
