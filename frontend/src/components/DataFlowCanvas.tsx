import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Sparkles,
  Activity,
  ArrowRight,
  Layers,
  ShieldCheck,
  Flame,
  Code2,
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
  onQuickChaos?: (nodeId: string) => void;
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
  onInspectCode,
  onQuickChaos,
  canShowHealed,
}) => {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const activeEdge =
    edges.find((e) => e.id === hoveredEdgeId) ||
    edges.find((e) => e.schema_migrated) ||
    edges[0];

  const isUpstreamOfSelected = (nodeId: string) =>
    selectedNode?.upstream_ids?.includes(nodeId) || false;

  const isDownstreamOfSelected = (nodeId: string) => {
    if (!selectedNode) return false;
    if (selectedNode.downstream_ids?.includes(nodeId)) return true;
    for (const d1 of selectedNode.downstream_ids || []) {
      const d1Node = nodes.find((n) => n.id === d1);
      if (d1Node?.downstream_ids?.includes(nodeId)) return true;
    }
    return false;
  };

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

  // Spacious 1140x200 SVG Coordinate System:
  // Nodes are 184px wide (-92 to +92). Center-to-center stepX = 290px -> 106px clean wire gap between nodes!
  const count = Math.max(nodes.length, 1);
  const startX = 135;
  const endX = 1005;
  const stepX = count > 1 ? (endX - startX) / (count - 1) : 0;
  const centerY = 98;

  const getNodeCoords = (idx: number) => ({
    x: startX + idx * stepX,
    y: centerY + (idx % 2 === 1 ? -10 : 10),
  });

  const agentScannerLabel = () => {
    if (!isHealing) return '';
    if (currentAgentNode === 'triage_with_nano') return 'Tier 1: Nano 30B Triaging...';
    if (currentAgentNode === 'ground_with_tavily') return 'Tier 2: Tavily Grounding...';
    if (currentAgentNode === 'plan_with_ultra') return 'Tier 3: Ultra 550B Plan...';
    if (currentAgentNode === 'synthesize_patch_with_super') return 'Tier 4: Super 120B Patch...';
    if (currentAgentNode === 'verify_patch_in_sandbox') return 'Sandbox Re-Tracing...';
    return 'Executing Runtime Tracer...';
  };

  const crashedCount = nodes.filter((n) => getEffectiveStatus(n) === 'CRASHED').length;
  const starvedCount = nodes.filter((n) => getEffectiveStatus(n) === 'STARVED').length;

  return (
    <div className="flex flex-col h-full pf-card border pf-border rounded-2xl overflow-hidden select-none">
      {/* 1. Canvas Top Toolbar */}
      <div className="py-2 px-4 pf-surface border-b pf-border flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold pf-accent-tint border shrink-0">
            <Layers className="w-3.5 h-3.5" />
            LIVE DATA-FLOW & BLAST-RADIUS X-RAY
          </span>
          <span className="text-xs font-bold pf-text truncate">{domainType || repoName}</span>

          {viewState === 'healed' ? (
            <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> All {nodes.length} Nodes Flowing (100% Verified)
            </span>
          ) : (
            <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 shrink-0">
              <AlertOctagon className="w-3 h-3" /> {crashedCount} Crash Origin • {starvedCount} Starved Downstream
            </span>
          )}
        </div>

        {/* Right: Active Agent Scanner Status + Broken / Healed Flow Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {isHealing && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold pf-accent-bg animate-pulse shadow-sm">
              <Activity className="w-3 h-3 animate-spin" />
              {agentScannerLabel()}
            </span>
          )}

          <div className="flex items-center pf-card border pf-border rounded-xl p-0.5 text-xs shrink-0">
            <button
              type="button"
              onClick={() => onToggleViewState('broken')}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold transition flex items-center gap-1 ${
                viewState === 'broken'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                  : 'pf-muted hover:pf-text'
              }`}
            >
              <AlertOctagon className="w-3 h-3 text-rose-500" />
              Broken Flow
            </button>
            <button
              type="button"
              onClick={() => onToggleViewState('healed')}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold transition flex items-center gap-1 ${
                viewState === 'healed'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                  : 'pf-muted hover:pf-text'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Healed Flow
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Graph Legend Strip (Dedicated strip so it NEVER overlaps nodes or buttons) */}
      <div className="px-4 py-1.5 pf-surface border-b pf-border flex items-center justify-between text-[10px] font-mono pf-muted z-10 shrink-0 gap-3">
        <div className="flex items-center gap-3.5 flex-wrap">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-[0_0_8px_#38bdf8]" />
            Live Payload Packet
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-[0_0_8px_#f43f5e]" />
            Crash Origin (Exception)
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            Starved Downstream (Blast Radius)
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_#34d399]" />
            Healed & Contract Verified
          </span>
        </div>
        <span className="hidden xl:inline text-[9.5px] pf-muted shrink-0">
          Click any node to inspect Blast Radius • Click any wire to inspect Data Contract
        </span>
      </div>

      {/* 3. Interactive Animated SVG Topology & Particle Graph */}
      <div className="flex-1 min-h-0 relative flex flex-col justify-between bg-[#090d16] text-slate-100 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] overflow-hidden">
        <svg
          viewBox="0 0 1140 200"
          className="w-full flex-1 h-full min-h-[140px] overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="pf-glow-emerald" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="pf-glow-red" x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* A. Directed Call Edges & Animated Glowing Payload Particles */}
          {edges.map((edge) => {
            const srcIdx = nodes.findIndex((n) => n.id === edge.source);
            const tgtIdx = nodes.findIndex((n) => n.id === edge.target);
            if (srcIdx === -1 || tgtIdx === -1) return null;

            const p1 = getNodeCoords(srcIdx);
            const p2 = getNodeCoords(tgtIdx);
            // Node half-width is 92px -> clean 106px wire gap between p1.x+92 and p2.x-92!
            const startEdgeX = p1.x + 92;
            const startEdgeY = p1.y;
            const endEdgeX = p2.x - 92;
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
                : '#ef4444';

            const labelText =
              edge.data_label.length > 14
                ? edge.data_label.slice(0, 13) + '…'
                : edge.data_label;

            return (
              <g
                key={edge.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
                onClick={() => setHoveredEdgeId(edge.id)}
              >
                <path d={pathD} fill="none" stroke="transparent" strokeWidth="22" />

                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isHovered ? 3.8 : 2.5}
                  strokeDasharray={isFlowing ? 'none' : '6 5'}
                  opacity={isFlowing ? 0.95 : 0.55}
                />

                {/* Animated Glowing Payload Particles along Active / Healed Edges */}
                {isFlowing ? (
                  <>
                    <circle
                      r="5"
                      fill={eStatus === 'HEALED_FLOW' ? '#34d399' : '#38bdf8'}
                      filter="url(#pf-glow-emerald)"
                    >
                      <animateMotion dur="1.5s" repeatCount="indefinite" path={pathD} />
                    </circle>
                    <circle r="3" fill="#ffffff">
                      <animateMotion
                        dur="1.5s"
                        begin="0.75s"
                        repeatCount="indefinite"
                        path={pathD}
                      />
                    </circle>
                  </>
                ) : (
                  /* Blocked X Indicator on Starved Wire */
                  <circle cx={midX} cy={midY} r="9" fill="#450a0a" stroke="#ef4444" strokeWidth="1.5" />
                )}

                {!isFlowing && (
                  <text
                    x={midX}
                    y={midY + 3.5}
                    textAnchor="middle"
                    fill="#fca5a5"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ✕
                  </text>
                )}

                {/* Edge Contract Pill Positioned Above the Wire Midpoint (Never Overlaps Nodes!) */}
                <g transform={`translate(${midX}, ${midY - 22})`}>
                  <rect
                    x="-46"
                    y="-10"
                    width="92"
                    height="18"
                    rx="5"
                    fill="#0f172a"
                    stroke={
                      edge.schema_migrated && viewState === 'healed'
                        ? '#10b981'
                        : isFlowing
                        ? '#38bdf8'
                        : '#7f1d1d'
                    }
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="2"
                    textAnchor="middle"
                    fill={
                      edge.schema_migrated && viewState === 'healed'
                        ? '#34d399'
                        : isFlowing
                        ? '#bae6fd'
                        : '#fca5a5'
                    }
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {edge.schema_migrated && viewState === 'healed'
                      ? `✨ ${labelText}`
                      : labelText}
                  </text>
                </g>
              </g>
            );
          })}

          {/* B. Architectural Stage Nodes */}
          {nodes.map((node, idx) => {
            const { x, y } = getNodeCoords(idx);
            const effStatus = getEffectiveStatus(node);
            const isSelected = node.id === selectedNodeId;
            const isReplayActive = node.id === activeReplayNodeId;
            const isUpstream = isUpstreamOfSelected(node.id);
            const isDownstream = isDownstreamOfSelected(node.id);

            let borderStroke = '#334155';
            let bgFill = '#111827';
            let badgeBg = '#1e293b';
            let badgeText = '#cbd5e1';
            let statusLabel = '✓ ACTIVE PASS';

            if (effStatus === 'CRASHED') {
              borderStroke = '#f43f5e';
              bgFill = '#250c14';
              badgeBg = '#881337';
              badgeText = '#fecdd3';
              statusLabel = node.sabotaged ? '⚡ SABOTAGED CRASH' : '💥 CRASH ORIGIN';
            } else if (effStatus === 'STARVED') {
              borderStroke = '#f59e0b';
              bgFill = '#18140c';
              badgeBg = '#451a03';
              badgeText = '#fde68a';
              statusLabel = '⚡ STARVED (0 Payloads)';
            } else if (effStatus === 'HEALED') {
              borderStroke = '#10b981';
              bgFill = '#072219';
              badgeBg = '#065f46';
              badgeText = '#a7f3d0';
              statusLabel = '✨ HEALED & VERIFIED';
            } else {
              borderStroke = '#0284c7';
              bgFill = '#0c1928';
              badgeBg = '#075985';
              badgeText = '#bae6fd';
              statusLabel = '✓ ACTIVE PASS';
            }

            if (isSelected) {
              borderStroke = '#818cf8';
            }

            // Bottom relationship subtitle inside node
            let bottomRelationText = `Blast Radius: ${node.blast_radius_count} downstream`;
            let bottomRelationColor = '#94a3b8';
            if (isSelected) {
              bottomRelationText = '● SELECTED IN INSPECTOR';
              bottomRelationColor = '#a5b4fc';
            } else if (isUpstream) {
              bottomRelationText = '▲ UPSTREAM CALLER';
              bottomRelationColor = '#38bdf8';
            } else if (isDownstream && effStatus !== 'CRASHED') {
              bottomRelationText = '▼ IN BLAST RADIUS';
              bottomRelationColor = '#fbbf24';
            }

            return (
              <g
                key={node.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectNode(node.id)}
                className="cursor-pointer"
              >
                {/* Pulsing Red Crash Shockwave Ring */}
                {effStatus === 'CRASHED' && (
                  <rect
                    x="-98"
                    y="-62"
                    width="196"
                    height="124"
                    rx="16"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    filter="url(#pf-glow-red)"
                  >
                    <animate
                      attributeName="stroke-width"
                      values="1.5;6;1.5"
                      dur="1.4s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.8;0.15;0.8"
                      dur="1.4s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}

                {/* Active AI Orbital Scanner Ring during LangGraph Healing */}
                {isHealing && node.status === 'CRASHED' && (
                  <rect
                    x="-103"
                    y="-67"
                    width="206"
                    height="134"
                    rx="18"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="3"
                    strokeDasharray="16 8"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="48"
                      dur="0.9s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}

                {/* Time-Travel Replay Highlight Ring */}
                {isReplayActive && (
                  <rect
                    x="-96"
                    y="-60"
                    width="192"
                    height="120"
                    rx="15"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2.5"
                  />
                )}

                {/* Node Card Body (184px wide x 110px tall) */}
                <rect
                  x="-92"
                  y="-55"
                  width="184"
                  height="110"
                  rx="13"
                  fill={bgFill}
                  stroke={borderStroke}
                  strokeWidth={isSelected ? '3' : '2'}
                  strokeDasharray={effStatus === 'STARVED' ? '6 4' : 'none'}
                />

                {/* Stage Layer & Criticality Header */}
                <text
                  x="-80"
                  y="-36"
                  fill="#94a3b8"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  STAGE {idx + 1} • {node.layer.slice(0, 10)}
                </text>
                <text
                  x="80"
                  y="-36"
                  textAnchor="end"
                  fill="#cbd5e1"
                  fontSize="8.5"
                  fontFamily="monospace"
                >
                  Crit:{Math.round(node.criticality_score * 100)}%
                </text>

                {/* File Name */}
                <text
                  x="0"
                  y="-15"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {node.file}
                </text>

                {/* Function Name */}
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="9.5"
                  fontFamily="monospace"
                >
                  {node.function.length > 24
                    ? node.function.slice(0, 23) + '…'
                    : `${node.function}()`}
                </text>

                {/* Status Badge Inside Node */}
                <rect x="-76" y="12" width="152" height="20" rx="5" fill={badgeBg} />
                <text
                  x="0"
                  y="25.5"
                  textAnchor="middle"
                  fill={badgeText}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {statusLabel}
                </text>

                {/* Blast Radius / Selection Subtitle */}
                <text
                  x="0"
                  y="46"
                  textAnchor="middle"
                  fill={bottomRelationColor}
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {bottomRelationText}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 3. Feature 5: Edge Contract & Schema Drift Lens Bar (Always visible or shows active wire) */}
        {(() => {
          const displayEdge =
            activeEdge ||
            edges.find((e) => e.source === selectedNodeId || e.target === selectedNodeId) ||
            edges.find((e) => e.status === 'STARVED_FLOW' || e.schema_migrated) ||
            edges[0];
          if (!displayEdge) return null;

          return (
            <div className="mx-3 mb-2.5 px-3.5 py-2 rounded-xl pf-surface border pf-border flex flex-wrap items-center justify-between gap-2 text-xs font-mono shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded pf-accent-tint pf-accent-text border pf-accent-border text-[10px] font-bold">
                  WIRE CONTRACT & DRIFT LENS
                </span>
                <span className="pf-text font-bold text-[11px]">
                  {displayEdge.source.split('::')[0]}{' '}
                  <ArrowRight className="inline w-3.5 h-3.5 pf-muted mx-0.5" />{' '}
                  {displayEdge.target.split('::')[0]}
                </span>
                {displayEdge.schema_migrated && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Schema Migrated by Nemotron Super
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] flex-wrap">
                {displayEdge.before_contract !== displayEdge.after_contract ? (
                  <div className="flex items-center gap-2">
                    <span className="text-rose-500 dark:text-rose-400 line-through">{displayEdge.before_contract}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-300 font-bold">{displayEdge.after_contract}</span>
                  </div>
                ) : (
                  <span className="pf-text text-[10.5px]">
                    Live Packet: <code className="text-sky-600 dark:text-sky-300 font-bold">{JSON.stringify(displayEdge.sample_packet || {})}</code>
                  </span>
                )}

                {selectedNode && onInspectCode && (
                  <button
                    type="button"
                    onClick={() => onInspectCode(selectedNode.file)}
                    className="px-2 py-0.5 rounded pf-card hover:opacity-90 pf-accent-text border pf-border text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Code2 className="w-3 h-3" /> Open {selectedNode.file}
                  </button>
                )}
                {selectedNode && onQuickChaos && (
                  <button
                    type="button"
                    onClick={() => onQuickChaos(selectedNode.id)}
                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-300 border border-amber-500/40 text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Flame className="w-3 h-3" /> Sabotage {selectedNode.file}
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
