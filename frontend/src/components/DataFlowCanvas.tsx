import React, { useState } from 'react';
import {
  Zap,
  AlertOctagon,
  CheckCircle2,
  Ban,
  Sparkles,
  Activity,
  ArrowRight,
  Layers,
  Flame,
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
  canShowHealed: boolean;
}

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
  canShowHealed,
}) => {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const hoveredEdge = edges.find((e) => e.id === hoveredEdgeId) || edges.find((e) => e.schema_migrated);

  // Determine blast-radius ring highlights for the currently selected node
  const isUpstreamOfSelected = (nodeId: string) =>
    selectedNode?.upstream_ids?.includes(nodeId) || false;
  const isDownstreamOfSelected = (nodeId: string) => {
    if (!selectedNode) return false;
    if (selectedNode.downstream_ids?.includes(nodeId)) return true;
    // Also check 2-hop transitive downstream
    for (const d1 of selectedNode.downstream_ids || []) {
      const d1Node = nodes.find((n) => n.id === d1);
      if (d1Node?.downstream_ids?.includes(nodeId)) return true;
    }
    return false;
  };

  // Compute display status for a node based on broken vs healed toggle
  const getEffectiveStatus = (node: TopologyNode): 'PASSED' | 'CRASHED' | 'STARVED' | 'HEALED' => {
    if (viewState === 'healed' && canShowHealed) {
      return node.status === 'CRASHED' ? 'HEALED' : 'PASSED';
    }
    return node.status;
  };

  const getEffectiveEdgeStatus = (edge: TopologyEdge): 'ACTIVE_FLOW' | 'STARVED_FLOW' | 'HEALED_FLOW' => {
    if (viewState === 'healed' && canShowHealed) {
      return edge.schema_migrated ? 'HEALED_FLOW' : 'ACTIVE_FLOW';
    }
    return edge.status;
  };

  // Horizontal layout coordinates inside an 880x260 SVG viewport
  const count = Math.max(nodes.length, 1);
  const startX = 115;
  const endX = 765;
  const stepX = count > 1 ? (endX - startX) / (count - 1) : 0;
  const centerY = 135;

  const getNodeCoords = (idx: number) => ({
    x: startX + idx * stepX,
    y: centerY + (idx % 2 === 1 ? -14 : 14),
  });

  const agentScannerLabel = () => {
    if (!isHealing) return '';
    if (currentAgentNode === 'triage_with_nano') return 'Nano 30B Triaging Crash Frame...';
    if (currentAgentNode === 'ground_with_tavily') return 'Tavily Grounding Live Docs...';
    if (currentAgentNode === 'plan_with_ultra') return 'Ultra 550B Blast-Radius Plan...';
    if (currentAgentNode === 'synthesize_patch_with_super') return 'Super 120B Synthesizing Diff...';
    if (currentAgentNode === 'verify_patch_in_sandbox') return 'Re-Tracing Healed Payload...';
    return 'Executing Sandbox Trace...';
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] relative overflow-hidden select-none">
      {/* Top Canvas Header Bar */}
      <div className="h-11 px-4 bg-[#111114] border-b border-zinc-800 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Layers className="w-3 h-3" />
            UNIVERSAL CODEBASE X-RAY
          </span>
          <span className="text-xs font-bold text-white">{domainType || repoName}</span>
          <span className="text-[11px] font-mono text-zinc-500 hidden md:inline">
            ({nodes.length} AST Nodes • {edges.length} Data-Contract Wires)
          </span>
        </div>

        {/* Right: Broken vs. Healed Flow Toggle */}
        <div className="flex items-center gap-2">
          {isHealing && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/40 animate-pulse">
              <Activity className="w-3 h-3 animate-spin" />
              {agentScannerLabel()}
            </span>
          )}

          <div className="flex items-center bg-[#09090b] border border-zinc-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => onToggleViewState('broken')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition flex items-center gap-1.5 ${
                viewState === 'broken'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <AlertOctagon className="w-3 h-3 text-red-400" />
              Broken Flow (Pre-Heal)
            </button>
            <button
              onClick={() => onToggleViewState('healed')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition flex items-center gap-1.5 ${
                viewState === 'healed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Healed Flow (Verified)
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive SVG Data-Flow & Topology Canvas */}
      <div className="flex-1 relative flex flex-col justify-between bg-[radial-gradient(#1f2430_1px,transparent_1px)] [background-size:20px_20px] overflow-hidden">
        <svg
          viewBox="0 0 880 265"
          className="w-full h-full max-h-[340px] overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Render Directed Call Edges & Animated Payload Particles */}
          {edges.map((edge) => {
            const srcIdx = nodes.findIndex((n) => n.id === edge.source);
            const tgtIdx = nodes.findIndex((n) => n.id === edge.target);
            if (srcIdx === -1 || tgtIdx === -1) return null;

            const p1 = getNodeCoords(srcIdx);
            const p2 = getNodeCoords(tgtIdx);
            const startEdgeX = p1.x + 82;
            const startEdgeY = p1.y;
            const endEdgeX = p2.x - 82;
            const endEdgeY = p2.y;
            const midX = (startEdgeX + endEdgeX) / 2;
            const midY = (startEdgeY + endEdgeY) / 2;

            const pathD = `M ${startEdgeX} ${startEdgeY} C ${midX} ${startEdgeY}, ${midX} ${endEdgeY}, ${endEdgeX} ${endEdgeY}`;
            const eStatus = getEffectiveEdgeStatus(edge);
            const isFlowing = eStatus === 'ACTIVE_FLOW' || eStatus === 'HEALED_FLOW';
            const isHovered = hoveredEdgeId === edge.id;

            const strokeColor =
              eStatus === 'HEALED_FLOW'
                ? '#10b981'
                : eStatus === 'ACTIVE_FLOW'
                ? '#38bdf8'
                : '#52525b';

            return (
              <g
                key={edge.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId(null)}
              >
                {/* Invisible wider hit target for hover/click */}
                <path d={pathD} fill="none" stroke="transparent" strokeWidth="18" />

                {/* Visible Wire */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isHovered ? 3.5 : 2.2}
                  strokeDasharray={isFlowing ? 'none' : '6 5'}
                  opacity={isFlowing ? 0.9 : 0.55}
                />

                {/* Animated Glowing Payload Particles along active/healed wires */}
                {isFlowing && (
                  <>
                    <circle
                      r="4.5"
                      fill={eStatus === 'HEALED_FLOW' ? '#34d399' : '#38bdf8'}
                      filter="url(#glow-emerald)"
                    >
                      <animateMotion dur="1.8s" repeatCount="indefinite" path={pathD} />
                    </circle>
                    <circle
                      r="3"
                      fill="#ffffff"
                    >
                      <animateMotion dur="1.8s" begin="0.9s" repeatCount="indefinite" path={pathD} />
                    </circle>
                  </>
                )}

                {/* Edge Label Pill + Schema Migrated Badge */}
                <g transform={`translate(${midX}, ${midY - 14})`}>
                  <rect
                    x="-54"
                    y="-10"
                    width="108"
                    height="19"
                    rx="5"
                    fill="#111115"
                    stroke={
                      edge.schema_migrated && viewState === 'healed'
                        ? '#10b981'
                        : isFlowing
                        ? '#27272a'
                        : '#3f3f46'
                    }
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="2.5"
                    textAnchor="middle"
                    fill={
                      edge.schema_migrated && viewState === 'healed'
                        ? '#34d399'
                        : isFlowing
                        ? '#d4d4d8'
                        : '#71717a'
                    }
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {edge.schema_migrated && viewState === 'healed'
                      ? `✨ ${edge.data_label}`
                      : edge.data_label}
                  </text>
                </g>
              </g>
            );
          })}

          {/* 2. Render Architectural Nodes */}
          {nodes.map((node, idx) => {
            const { x, y } = getNodeCoords(idx);
            const effStatus = getEffectiveStatus(node);
            const isSelected = node.id === selectedNodeId;
            const isReplayActive = node.id === activeReplayNodeId;
            const isUpstream = isUpstreamOfSelected(node.id);
            const isDownstream = isDownstreamOfSelected(node.id);

            let borderStroke = '#27272a';
            let bgFill = '#121217';
            let badgeBg = '#18181b';
            let badgeText = '#a1a1aa';
            let statusLabel = 'PASSED';

            if (effStatus === 'CRASHED') {
              borderStroke = '#ef4444';
              bgFill = '#1f0d11';
              badgeBg = '#450a0a';
              badgeText = '#fca5a5';
              statusLabel = node.sabotaged ? '⚡ SABOTAGED CRASH' : '💥 CRASH ORIGIN';
            } else if (effStatus === 'STARVED') {
              borderStroke = '#71717a';
              bgFill = '#0e0e12';
              badgeBg = '#27272a';
              badgeText = '#fbbf24';
              statusLabel = '⚡ STARVED (0 Payloads)';
            } else if (effStatus === 'HEALED') {
              borderStroke = '#10b981';
              bgFill = '#091914';
              badgeBg = '#064e3b';
              badgeText = '#6ee7b7';
              statusLabel = '✨ HEALED & VERIFIED';
            } else {
              borderStroke = '#0284c7';
              bgFill = '#0c151c';
              badgeBg = '#0c4a6e';
              badgeText = '#7dd3fc';
              statusLabel = '✓ ACTIVE PASS';
            }

            if (isSelected) {
              borderStroke = '#ffffff';
            } else if (isUpstream) {
              borderStroke = '#38bdf8';
            } else if (isDownstream && effStatus !== 'PASSED') {
              borderStroke = '#f59e0b';
            }

            return (
              <g
                key={node.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectNode(node.id)}
                className="cursor-pointer transition-transform"
              >
                {/* Pulsing Red Crash Shockwave Ring */}
                {effStatus === 'CRASHED' && (
                  <rect
                    x="-88"
                    y="-56"
                    width="176"
                    height="112"
                    rx="14"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    opacity="0.55"
                    filter="url(#glow-red)"
                  >
                    <animate
                      attributeName="stroke-width"
                      values="1.5;5;1.5"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.7;0.15;0.7"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}

                {/* Active Healing Scanner Orbit when LangGraph is working */}
                {isHealing && node.status === 'CRASHED' && (
                  <rect
                    x="-92"
                    y="-60"
                    width="184"
                    height="120"
                    rx="16"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2.5"
                    strokeDasharray="14 8"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="44"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}

                {/* Replay Active Highlight Ring */}
                {isReplayActive && (
                  <rect
                    x="-87"
                    y="-55"
                    width="174"
                    height="110"
                    rx="13"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2.5"
                  />
                )}

                {/* Main Node Card */}
                <rect
                  x="-82"
                  y="-50"
                  width="164"
                  height="100"
                  rx="11"
                  fill={bgFill}
                  stroke={borderStroke}
                  strokeWidth={isSelected ? '2.5' : '1.8'}
                  strokeDasharray={effStatus === 'STARVED' ? '5 3' : 'none'}
                />

                {/* Architectural Layer Header Tag */}
                <text
                  x="-70"
                  y="-33"
                  fill="#9ca3af"
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  [{node.layer}]
                </text>

                {/* Criticality Score Pill */}
                <text
                  x="70"
                  y="-33"
                  textAnchor="end"
                  fill="#a1a1aa"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  Crit:{Math.round(node.criticality_score * 100)}%
                </text>

                {/* File Name */}
                <text
                  x="0"
                  y="-14"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {node.file}
                </text>

                {/* Function / Class Name */}
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fill="#d4d4d8"
                  fontSize="9.5"
                  fontFamily="monospace"
                >
                  {node.function.length > 23
                    ? node.function.slice(0, 22) + '…'
                    : node.function}
                </text>

                {/* Status Pill inside Node */}
                <rect
                  x="-68"
                  y="14"
                  width="136"
                  height="18"
                  rx="4"
                  fill={badgeBg}
                />
                <text
                  x="0"
                  y="26"
                  textAnchor="middle"
                  fill={badgeText}
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {statusLabel}
                </text>

                {/* Blast Radius Ring Badge (Upstream / Downstream indicator) */}
                {isUpstream && (
                  <text
                    x="0"
                    y="44"
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ▲ UPSTREAM CALLER
                  </text>
                )}
                {isDownstream && (
                  <text
                    x="0"
                    y="44"
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ▼ DOWNSTREAM IN BLAST RADIUS
                  </text>
                )}
                {!isUpstream && !isDownstream && (
                  <text
                    x="0"
                    y="44"
                    textAnchor="middle"
                    fill="#71717a"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    Blast Radius: {node.blast_radius_count} downstream
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Feature 5: Edge Contract & Schema Drift Lens Bar */}
        {hoveredEdge && (
          <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-[#11131a]/95 border border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono shadow-lg">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold">
                WIRE CONTRACT LENS
              </span>
              <span className="text-zinc-300 font-semibold">
                {hoveredEdge.source.split('::')[0]} <ArrowRight className="inline w-3 h-3 text-zinc-500" />{' '}
                {hoveredEdge.target.split('::')[0]}
              </span>
              {hoveredEdge.schema_migrated && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Schema Migrated
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[10px]">
              {hoveredEdge.before_contract !== hoveredEdge.after_contract ? (
                <>
                  <span className="text-red-400 line-through">{hoveredEdge.before_contract}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                  <span className="text-emerald-400 font-bold">{hoveredEdge.after_contract}</span>
                </>
              ) : (
                <span className="text-zinc-400">
                  Packet: {JSON.stringify(hoveredEdge.sample_packet || {})}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
