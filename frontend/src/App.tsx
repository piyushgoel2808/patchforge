import React, { useState, useEffect } from 'react';
import { RepoExplorer } from './components/RepoExplorer';
import { JudgeFastTrack } from './components/JudgeFastTrack';
import { AgentGraphLive } from './components/AgentGraphLive';
import { DiffViewer } from './components/DiffViewer';
import { TerminalOutput } from './components/TerminalOutput';
import { TelemetryHUD } from './components/TelemetryHUD';
import { BenchmarkTab } from './components/BenchmarkTab';
import { DataFlowCanvas, TopologyNode, TopologyEdge } from './components/DataFlowCanvas';
import { BlastRadiusInspector } from './components/BlastRadiusInspector';
import { PayloadReplaySlider, TraceHop } from './components/PayloadReplaySlider';
import { ChaosFaultInjector } from './components/ChaosFaultInjector';
import {
  Shield,
  Sparkles,
  Wrench,
  BarChart3,
  Github,
  Play,
  Loader2,
  GitBranch,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Network,
} from 'lucide-react';

interface ScenarioFile {
  filename: string;
  content: string;
  is_target: boolean;
  language: string;
}

export interface Scenario {
  id: string;
  folder: string;
  name: string;
  title: string;
  short_title: string;
  category: string;
  library: string;
  target_library: string;
  target_version: string;
  badge: string;
  color: string;
  description: string;
  failing_tests: string[];
  solution_summary: string;
  files: ScenarioFile[];
  baseline_stderr: string;
  target_file: string;
  buggy_lines: number[];
}

export default function App() {
  // 3-Tab Visual Command Center: 'xray' (Data-Flow & Blast-Radius) | 'workbench' (Code Diff & Terminal) | 'benchmark'
  const [activeTab, setActiveTab] = useState<'xray' | 'workbench' | 'benchmark'>('xray');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario:repo_1_pydantic_v2');
  const [activeFilename, setActiveFilename] = useState<string>('models.py');
  const [showJudgeBanner, setShowJudgeBanner] = useState<boolean>(true);

  // Health & API Mode State
  const [healthData, setHealthData] = useState<any>(null);
  const [executionMode, setExecutionMode] = useState<string>('SIMULATED_FALLBACK');

  // Data-Flow X-Ray & Runtime Tracer State (v2.0)
  const [domainType, setDomainType] = useState<string>('E-Commerce Order & Payment Engine');
  const [topologyNodes, setTopologyNodes] = useState<TopologyNode[]>([]);
  const [topologyEdges, setTopologyEdges] = useState<TopologyEdge[]>([]);
  const [brokenTrace, setBrokenTrace] = useState<TraceHop[]>([]);
  const [healedTrace, setHealedTrace] = useState<TraceHop[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('models.py::UserModel');
  const [flowViewState, setFlowViewState] = useState<'broken' | 'healed'>('broken');
  const [activeReplayStep, setActiveReplayStep] = useState<number>(1);

  // Center Code Editor State
  const [editorTab, setEditorTab] = useState<'source' | 'diff' | 'citations'>('source');

  // Custom Repo Input Modal
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customRepoUrl, setCustomRepoUrl] = useState<string>('');

  // Agent Pipeline Execution State
  const [isHealing, setIsHealing] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('IDLE');
  const [currentNode, setCurrentNode] = useState<string>('');
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [skippedNodes, setSkippedNodes] = useState<string[]>([]);
  const [stepTimings, setStepTimings] = useState<Record<string, number>>({});

  // Agent Artifacts
  const [initialTestOutput, setInitialTestOutput] = useState<any>(null);
  const [currentTestOutput, setCurrentTestOutput] = useState<any>(null);
  const [diffText, setDiffText] = useState<string>('');
  const [patchExplanation, setPatchExplanation] = useState<string>('');
  const [patchedFiles, setPatchedFiles] = useState<Record<string, string>>({});
  const [tavilyCitations, setTavilyCitations] = useState<any[]>([]);
  const [tavilySummary, setTavilySummary] = useState<string>('');
  const [refactoringPlan, setRefactoringPlan] = useState<string>('');
  const [triageData, setTriageData] = useState<any>(null);
  const [prBundle, setPrBundle] = useState<any>(null);

  // Telemetry
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
  const [latestTelemetry, setLatestTelemetry] = useState<any>(null);
  const [confidenceScore, setConfidenceScore] = useState<number>(0.65);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [cumulativeCost, setCumulativeCost] = useState<number>(0);
  const [cumulativeSavings, setCumulativeSavings] = useState<number>(0);

  useEffect(() => {
    fetchHealth();
    fetchScenarios();
  }, []);

  useEffect(() => {
    if (activeScenarioId) {
      fetchTopology(activeScenarioId, false);
    }
  }, [activeScenarioId]);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthData(data);
      if (data.execution_mode) {
        setExecutionMode(data.execution_mode);
      }
    } catch (err) {
      console.error('Failed to fetch health status:', err);
    }
  };

  const fetchScenarios = async () => {
    try {
      const res = await fetch('/api/scenarios');
      const data = await res.json();
      const loaded: Scenario[] = data.scenarios || [];
      setScenarios(loaded);

      if (loaded.length > 0) {
        setActiveScenarioId(loaded[0].id);
        const targetF = loaded[0].files.find((f) => f.is_target);
        if (targetF) setActiveFilename(targetF.filename);
      }
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    }
  };

  const fetchTopology = async (scenarioId: string, healed: boolean = false) => {
    try {
      const cleanId = scenarioId.replace('scenario:', '');
      const res = await fetch(`/api/topology/${encodeURIComponent(cleanId)}?healed=${healed}`);
      const data = await res.json();
      applyTopologyPayload(data, healed);
    } catch (err) {
      console.error('Failed to load topology:', err);
    }
  };

  const applyTopologyPayload = (data: any, healed: boolean) => {
    if (!data) return;
    if (data.domain_type) setDomainType(data.domain_type);
    const nodes: TopologyNode[] = data.topology?.nodes || [];
    const edges: TopologyEdge[] = data.topology?.edges || [];
    if (nodes.length > 0) {
      setTopologyNodes(nodes);
      const crashNode = nodes.find((n) => n.status === 'CRASHED') || nodes[1] || nodes[0];
      if (crashNode) setSelectedNodeId(crashNode.id);
    }
    if (edges.length > 0) setTopologyEdges(edges);

    const traces = data.execution_traces || {};
    if (traces.initial_broken_trace) {
      setBrokenTrace(traces.initial_broken_trace);
      const crashHopIdx = traces.initial_broken_trace.findIndex((h: any) => h.status === 'CRASHED');
      setActiveReplayStep(crashHopIdx >= 0 ? crashHopIdx : 0);
    }
    if (traces.healed_verified_trace) {
      setHealedTrace(traces.healed_verified_trace);
    }
    setFlowViewState(healed ? 'healed' : 'broken');
  };

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];
  const activeFile =
    activeScenario?.files?.find((f) => f.filename === activeFilename) ||
    activeScenario?.files?.[0];

  const handleSelectScenario = (id: string) => {
    if (isHealing) return;
    setActiveScenarioId(id);
    const sc = scenarios.find((s) => s.id === id);
    if (sc) {
      const targetF = sc.files.find((f) => f.is_target) || sc.files[0];
      if (targetF) setActiveFilename(targetF.filename);
    }
    setEditorTab('source');
    setStatus('IDLE');
    setCurrentNode('');
    setCompletedNodes([]);
    setSkippedNodes([]);
    setStepTimings({});
    setDiffText('');
    setPatchExplanation('');
    setPatchedFiles({});
    setTavilyCitations([]);
    setTavilySummary('');
    setRefactoringPlan('');
    setTriageData(null);
    setInitialTestOutput(null);
    setCurrentTestOutput(null);
    setTelemetryHistory([]);
    setLatestTelemetry(null);
    setCumulativeCost(0);
    setCumulativeSavings(0);
    setTotalTokens(0);
    setPrBundle(null);
    setFlowViewState('broken');
  };

  const handleInjectChaosFault = async (nodeId: string, faultType: string, autoHeal: boolean) => {
    try {
      const res = await fetch('/api/chaos/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: activeScenarioId,
          node_id: nodeId,
          fault_type: faultType,
        }),
      });
      const data = await res.json();
      applyTopologyPayload(data, false);
      setSelectedNodeId(nodeId);
      setStatus('FAILED');

      if (autoHeal) {
        await handleStartHealing(activeScenarioId, nodeId, faultType);
      }
    } catch (err) {
      console.error('Failed to inject chaos fault:', err);
    }
  };

  const handleStartHealing = async (
    target?: string,
    sabotagedNodeId?: string,
    faultType?: string
  ) => {
    const finalTarget = target || activeScenarioId;
    if (target && target.startsWith('scenario:') && target !== activeScenarioId) {
      setActiveScenarioId(target);
      const sc = scenarios.find((s) => s.id === target);
      if (sc) {
        const targetF = sc.files.find((f) => f.is_target) || sc.files[0];
        if (targetF) setActiveFilename(targetF.filename);
      }
    }

    if (activeTab === 'benchmark') setActiveTab('xray');
    setIsHealing(true);
    setStatus('INITIALIZING');
    setCurrentNode('run_initial_tests');
    setCompletedNodes([]);
    setSkippedNodes([]);
    setStepTimings({});
    setDiffText('');
    setPatchExplanation('');
    setPatchedFiles({});
    setTavilyCitations([]);
    setTavilySummary('');
    setRefactoringPlan('');
    setTriageData(null);
    setTelemetryHistory([]);
    setLatestTelemetry(null);
    setInitialTestOutput(null);
    setCurrentTestOutput(null);
    setPrBundle(null);
    setCumulativeCost(0);
    setCumulativeSavings(0);
    setTotalTokens(0);
    setFlowViewState('broken');

    try {
      const response = await fetch('/api/heal/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: finalTarget,
          sabotaged_node_id: sabotagedNodeId,
          fault_type: faultType,
        }),
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported by browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const match = block.match(/^data:\s*(.+)$/m);
          if (match) {
            try {
              const eventObj = JSON.parse(match[1]);
              handleSSEEvent(eventObj);
            } catch (e) {
              console.error('Failed to parse SSE payload:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error during SSE stream:', err);
      setStatus('FAILED');
    } finally {
      setIsHealing(false);
    }
  };

  const handleSSEEvent = (eventObj: any) => {
    const { event, data } = eventObj;

    switch (event) {
      case 'workflow_start':
        setStatus(data.status || 'INITIALIZING');
        if (data.execution_mode) setExecutionMode(data.execution_mode);
        break;

      case 'node_start':
        setCurrentNode(data.node);
        break;

      case 'dataflow_trace':
        if (data.dataflow_topology) {
          applyTopologyPayload(
            {
              ...data.dataflow_topology,
              execution_traces: data.execution_traces,
            },
            data.phase === 'HEALED_VERIFIED'
          );
        }
        break;

      case 'node_complete':
        setCompletedNodes((prev) => (prev.includes(data.node) ? prev : [...prev, data.node]));
        if (data.step_timings) setStepTimings(data.step_timings);
        if (data.skipped_nodes) setSkippedNodes(data.skipped_nodes);
        if (data.execution_mode) setExecutionMode(data.execution_mode);

        if (data.node === 'run_initial_tests') {
          setInitialTestOutput(data.test_output);
          setCurrentTestOutput(data.test_output);
        } else if (data.node === 'triage_with_nano') {
          setTriageData(data);
          setConfidenceScore(data.confidence ?? 0.65);
          if (data.telemetry) {
            setLatestTelemetry(data.telemetry);
            setTelemetryHistory((prev) => [...prev, data.telemetry]);
          }
          if (data.cumulative) {
            setCumulativeCost(data.cumulative.cost_usd || 0);
            setCumulativeSavings(data.cumulative.dollars_saved_usd || 0);
            setTotalTokens(data.cumulative.total_tokens || 0);
          }
        } else if (data.node === 'ground_with_tavily') {
          setTavilyCitations(data.citations || []);
          setTavilySummary(data.summary || '');
        } else if (data.node === 'plan_with_ultra') {
          setRefactoringPlan(data.refactoring_plan || '');
          if (data.telemetry) {
            setLatestTelemetry(data.telemetry);
            setTelemetryHistory((prev) => [...prev, data.telemetry]);
          }
          if (data.cumulative) {
            setCumulativeCost(data.cumulative.cost_usd || 0);
            setCumulativeSavings(data.cumulative.dollars_saved_usd || 0);
            setTotalTokens(data.cumulative.total_tokens || 0);
          }
        } else if (data.node === 'synthesize_patch_with_super') {
          setDiffText(data.combined_diff || '');
          if (data.patch_explanation) setPatchExplanation(data.patch_explanation);
          if (data.patched_files) setPatchedFiles(data.patched_files);
          setEditorTab('diff');
          if (data.telemetry) {
            setLatestTelemetry(data.telemetry);
            setTelemetryHistory((prev) => [...prev, data.telemetry]);
          }
          if (data.cumulative) {
            setCumulativeCost(data.cumulative.cost_usd || 0);
            setCumulativeSavings(data.cumulative.dollars_saved_usd || 0);
            setTotalTokens(data.cumulative.total_tokens || 0);
          }
        } else if (data.node === 'verify_patch_in_sandbox') {
          setCurrentTestOutput(data.test_output);
          if (data.combined_diff) setDiffText(data.combined_diff);
          if (data.patch_explanation) setPatchExplanation(data.patch_explanation);
          setStatus(data.status);
          if (data.status === 'HEALED') {
            setFlowViewState('healed');
            setActiveReplayStep(3);
          }
        }
        break;

      case 'workflow_complete':
        setCurrentNode('');
        setStatus(data.status);
        if (data.combined_diff) setDiffText(data.combined_diff);
        if (data.patch_explanation) setPatchExplanation(data.patch_explanation);
        if (data.patched_files) setPatchedFiles(data.patched_files);
        if (data.step_timings) setStepTimings(data.step_timings);
        if (data.skipped_nodes) setSkippedNodes(data.skipped_nodes);
        if (data.dataflow_topology) {
          applyTopologyPayload(
            {
              ...data.dataflow_topology,
              execution_traces: data.execution_traces,
            },
            data.status === 'HEALED'
          );
        }
        setCumulativeCost(data.total_cost_usd || 0);
        setCumulativeSavings(data.total_dollars_saved || 0);
        setTotalTokens(data.total_tokens || 0);
        break;

      case 'workflow_error':
        setCurrentNode('');
        setStatus('FAILED');
        break;
    }
  };

  const handleExportPR = async () => {
    try {
      const res = await fetch('/api/export/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_name: activeScenario?.folder || 'patchforge-repo',
          patch_content: diffText,
          explanation: patchExplanation,
          root_cause: triageData?.root_cause || '',
          citations: tavilyCitations,
        }),
      });
      const data = await res.json();
      if (data.success) setPrBundle(data);
    } catch (err) {
      console.error('Error exporting PR:', err);
    }
  };

  const isLiveApi = executionMode === 'LIVE_API' || healthData?.nebius?.connected;
  const selectedNodeObj = topologyNodes.find((n) => n.id === selectedNodeId) || topologyNodes[0];
  const activeTraceList = flowViewState === 'healed' ? healedTrace : brokenTrace;
  const activeReplayHop = activeTraceList[activeReplayStep] || activeTraceList[0];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#09090b] text-zinc-100 font-sans select-none">
      {/* 1. TOP COMMAND BAR */}
      <header className="h-14 shrink-0 border-b border-zinc-800 bg-[#111114] px-4 flex items-center justify-between z-40">
        {/* Left: Brand & Live Connection Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
            <Shield className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 leading-none">
              <span className="font-bold text-sm tracking-tight text-white">PatchForge v2.0</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                  isLiveApi
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                }`}
              >
                {isLiveApi ? '● Live Nebius + Tavily API' : '● Token Factory Ready'}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              Universal Codebase Data-Flow, Blast-Radius & Self-Healing Engine
            </span>
          </div>
        </div>

        {/* Center: Scenario Switcher & Primary CTA */}
        <div className="flex items-center gap-2">
          <div className="hidden xl:flex items-center bg-[#09090b] border border-zinc-800 rounded-lg p-0.5">
            {scenarios.map((sc) => {
              const isSelected = sc.id === activeScenarioId;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc.id)}
                  disabled={isHealing}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-zinc-200'
                  } ${isHealing ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                  {sc.short_title || sc.title}
                </button>
              );
            })}

            <button
              onClick={() => setShowCustomModal(true)}
              disabled={isHealing}
              className="px-2 py-1 text-zinc-400 hover:text-zinc-200 text-[11px] flex items-center gap-1 transition"
              title="Clone Custom GitHub Repository"
            >
              <Plus className="w-3 h-3" />
              Git URL
            </button>
          </div>

          <button
            onClick={() => handleStartHealing()}
            disabled={isHealing}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shadow-sm ${
              isHealing
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-emerald-500/20'
            }`}
          >
            {isHealing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Healing Pipeline...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                ⚡ Run Auto-Heal
              </>
            )}
          </button>

          <button
            onClick={() => setShowJudgeBanner((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium flex items-center gap-1 transition"
            title="Toggle 4-Scenario Judge Fast-Track Bar"
          >
            <Sparkles className="w-3 h-3" />
            Fast-Track
            {showJudgeBanner ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Right: 3-Tab Command Center Switcher & GitHub */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#09090b] border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('xray')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'xray'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-sm border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Data-Flow X-Ray
            </button>
            <button
              onClick={() => setActiveTab('workbench')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'workbench'
                  ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Code & Diff
            </button>
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'benchmark'
                  ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-zinc-700/60'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Benchmarks
            </button>
          </div>

          <a
            href="https://github.com/piyushgoel2808/patchforge"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition"
            title="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Collapsible 4-Scenario Judge Fast-Track Bar */}
      {showJudgeBanner && activeTab !== 'benchmark' && (
        <JudgeFastTrack
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          isRunning={isHealing}
          onSelectScenario={handleSelectScenario}
          onStartHealing={(target) => {
            setShowJudgeBanner(false);
            handleStartHealing(target);
          }}
          onClose={() => setShowJudgeBanner(false)}
        />
      )}

      {/* Custom Repo Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-zinc-800 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-400" />
                X-Ray & Heal Custom GitHub Repository
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Enter any public Git repository containing Python modules and a `pytest` suite to map its AST Data-Flow Graph and heal failing tests:
            </p>
            <input
              type="text"
              placeholder="https://github.com/owner/repository"
              value={customRepoUrl}
              onChange={(e) => setCustomRepoUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customRepoUrl.trim()) {
                    setShowCustomModal(false);
                    handleStartHealing(customRepoUrl.trim());
                  }
                }}
                disabled={!customRepoUrl.trim()}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-xs disabled:opacity-50 transition"
              >
                Clone, Map & Heal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. HORIZONTAL 5-STAGE PIPELINE RIBBON */}
      <AgentGraphLive
        currentNode={currentNode}
        completedNodes={completedNodes}
        status={status}
        telemetryHistory={telemetryHistory}
        stepTimings={stepTimings}
        confidenceScore={confidenceScore}
        skippedNodes={skippedNodes}
      />

      {/* 3. MAIN WORKSPACE CONTENT (3 TABS) */}
      {activeTab === 'xray' ? (
        <div className="flex-1 min-h-0 grid grid-cols-12 divide-x divide-zinc-800 bg-[#09090b]">
          {/* LEFT / CENTER (8 cols): Interactive Live Data-Flow Canvas (Top) + Time-Travel Payload Slider (Bottom) */}
          <div className="col-span-8 flex flex-col min-h-0 bg-[#09090b]">
            <div className="h-[56%] min-h-0 flex flex-col">
              <DataFlowCanvas
                repoName={activeScenario?.folder || 'repo_1_pydantic_v2'}
                domainType={domainType}
                nodes={topologyNodes}
                edges={topologyEdges}
                selectedNodeId={selectedNodeId}
                activeReplayNodeId={activeReplayHop?.node_id}
                isHealing={isHealing}
                currentAgentNode={currentNode}
                viewState={flowViewState}
                onToggleViewState={(m) => setFlowViewState(m)}
                onSelectNode={(nid) => {
                  setSelectedNodeId(nid);
                  const traceIdx = activeTraceList.findIndex((h) => h.node_id === nid);
                  if (traceIdx >= 0) setActiveReplayStep(traceIdx);
                }}
                canShowHealed={true}
              />
            </div>

            <div className="h-[44%] min-h-0 flex flex-col">
              <PayloadReplaySlider
                brokenTrace={brokenTrace}
                healedTrace={healedTrace}
                traceMode={flowViewState}
                onChangeTraceMode={(m) => setFlowViewState(m)}
                activeStepIndex={activeReplayStep}
                onChangeStepIndex={(idx) => {
                  setActiveReplayStep(idx);
                  const hop = activeTraceList[idx];
                  if (hop?.node_id) setSelectedNodeId(hop.node_id);
                }}
                canShowHealed={true}
              />
            </div>
          </div>

          {/* RIGHT PANE (4 cols): Blast-Radius Inspector + Chaos Fault Injector + Telemetry HUD */}
          <div className="col-span-4 flex flex-col min-h-0 divide-y divide-zinc-800 bg-[#0c0c0f]">
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <BlastRadiusInspector
                selectedNode={selectedNodeObj}
                allNodes={topologyNodes}
                isHealed={flowViewState === 'healed' || status === 'HEALED'}
                triageData={triageData}
                refactoringPlan={refactoringPlan}
                onSelectNode={(nid) => setSelectedNodeId(nid)}
                onOpenCodeFile={(fname) => {
                  setActiveFilename(fname);
                  setActiveTab('workbench');
                  setEditorTab(diffText ? 'diff' : 'source');
                }}
              />
            </div>

            <div className="shrink-0">
              <ChaosFaultInjector
                nodes={topologyNodes}
                selectedNodeId={selectedNodeId}
                isHealing={isHealing}
                onInjectFault={handleInjectChaosFault}
              />
            </div>

            <div className="h-48 shrink-0 flex flex-col min-h-0">
              <TelemetryHUD
                latestTelemetry={latestTelemetry}
                telemetryHistory={telemetryHistory}
                confidenceScore={confidenceScore}
                totalTokens={totalTokens}
                cumulativeCost={cumulativeCost}
                cumulativeSavings={cumulativeSavings}
                isHealing={isHealing}
                status={status}
              />
            </div>
          </div>
        </div>
      ) : activeTab === 'workbench' ? (
        <div className="flex-1 min-h-0 grid grid-cols-12 divide-x divide-zinc-800 bg-[#09090b]">
          <div className="col-span-3 flex flex-col min-h-0 bg-[#0c0c0f]">
            <RepoExplorer
              scenario={activeScenario}
              activeFilename={activeFilename}
              onSelectFile={(f) => {
                setActiveFilename(f);
                setEditorTab('source');
              }}
              status={status}
              triageData={triageData}
              refactoringPlan={refactoringPlan}
            />
          </div>

          <div className="col-span-5 flex flex-col min-h-0 bg-[#09090b]">
            <DiffViewer
              activeTab={editorTab}
              onTabChange={setEditorTab}
              activeFile={activeFile}
              diffText={diffText}
              patchExplanation={patchExplanation}
              patchedFiles={patchedFiles}
              citations={tavilyCitations}
              tavilySummary={tavilySummary}
              buggyLines={activeScenario?.buggy_lines || []}
              onExportPR={handleExportPR}
              prBundle={prBundle}
              onClosePrBundle={() => setPrBundle(null)}
            />
          </div>

          <div className="col-span-4 flex flex-col min-h-0 divide-y divide-zinc-800 bg-[#0c0c0f]">
            <div className="h-1/2 flex flex-col min-h-0">
              <TerminalOutput
                initialOutput={initialTestOutput}
                currentOutput={currentTestOutput}
                baselineStderr={activeScenario?.baseline_stderr}
                status={status}
                isHealing={isHealing}
              />
            </div>

            <div className="h-1/2 flex flex-col min-h-0">
              <TelemetryHUD
                latestTelemetry={latestTelemetry}
                telemetryHistory={telemetryHistory}
                confidenceScore={confidenceScore}
                totalTokens={totalTokens}
                cumulativeCost={cumulativeCost}
                cumulativeSavings={cumulativeSavings}
                isHealing={isHealing}
                status={status}
              />
            </div>
          </div>
        </div>
      ) : (
        <BenchmarkTab activeScenarioId={activeScenarioId} />
      )}
    </div>
  );
}
