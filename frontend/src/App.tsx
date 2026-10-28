import React, { useState, useEffect } from 'react';
import { AgentGraphLive } from './components/AgentGraphLive';
import { DiffViewer } from './components/DiffViewer';
import { TerminalOutput } from './components/TerminalOutput';
import { TelemetryHUD } from './components/TelemetryHUD';
import { BenchmarkTab } from './components/BenchmarkTab';
import { DataFlowCanvas, TopologyNode, TopologyEdge } from './components/DataFlowCanvas';
import { PayloadReplaySlider, TraceHop } from './components/PayloadReplaySlider';
import {
  Shield,
  BarChart3,
  Github,
  Play,
  Loader2,
  GitBranch,
  Plus,
  X,
  CheckCircle2,
  Sparkles,
  Layers,
  Cpu,
  Globe,
  Brain,
  Wrench,
  ArrowRight,
  AlertCircle,
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
  // Clean 3-Page Navigation: 'studio' (Guided Product Studio) | 'benchmark' (Cost & Latency ROI) | 'architecture' (How It Works)
  const [activePage, setActivePage] = useState<'studio' | 'benchmark' | 'architecture'>('studio');

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario:repo_1_pydantic_v2');
  const [activeFilename, setActiveFilename] = useState<string>('models.py');

  // Health & API Mode State
  const [healthData, setHealthData] = useState<any>(null);
  const [executionMode, setExecutionMode] = useState<string>('SIMULATED_FALLBACK');

  // Data-Flow X-Ray & Runtime Tracer State
  const [domainType, setDomainType] = useState<string>('E-Commerce Order & Payment Engine');
  const [topologyNodes, setTopologyNodes] = useState<TopologyNode[]>([]);
  const [topologyEdges, setTopologyEdges] = useState<TopologyEdge[]>([]);
  const [brokenTrace, setBrokenTrace] = useState<TraceHop[]>([]);
  const [healedTrace, setHealedTrace] = useState<TraceHop[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('models.py::UserModel');
  const [flowViewState, setFlowViewState] = useState<'broken' | 'healed'>('broken');
  const [activeReplayStep, setActiveReplayStep] = useState<number>(1);

  // Code Editor State
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

    setActivePage('studio');
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
  const activeTraceList = flowViewState === 'healed' ? healedTrace : brokenTrace;
  const activeReplayHop = activeTraceList[activeReplayStep] || activeTraceList[0];

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col">
      {/* 1. CLEAN ENTERPRISE NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 h-16 border-b border-zinc-800/80 bg-[#090a0f]/90 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Brand Logo */}
          <div
            onClick={() => setActivePage('studio')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">PatchForge</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-medium">
                  {isLiveApi ? '● Live API Connected' : '● Nebius Token Factory Ready'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Autonomous Codebase X-Ray & Self-Healing Platform
              </p>
            </div>
          </div>

          {/* Primary Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#11141f] border border-zinc-800/80 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setActivePage('studio')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activePage === 'studio'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              1. Interactive Healing Studio
            </button>
            <button
              type="button"
              onClick={() => setActivePage('benchmark')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activePage === 'benchmark'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              2. Cost & Speed Benchmarks
            </button>
            <button
              type="button"
              onClick={() => setActivePage('architecture')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activePage === 'architecture'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              3. How the 4-Tier Cascade Works
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            disabled={isHealing}
            className="px-3.5 py-2 rounded-xl bg-[#11141f] hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            Connect GitHub URL
          </button>

          <a
            href="https://github.com/piyushgoel2808/patchforge"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-[#11141f] hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition"
            title="View Source on GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Custom Repo Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141f] border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-400" />
                Connect Custom GitHub Repository
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Paste any public GitHub repository URL containing Python modules and a `pytest` suite. PatchForge will clone it into an isolated sandbox, map its AST data-flow graph, and autonomously patch failing unit tests:
            </p>
            <input
              type="text"
              placeholder="https://github.com/owner/repository"
              value={customRepoUrl}
              onChange={(e) => setCustomRepoUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-zinc-700 rounded-xl text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (customRepoUrl.trim()) {
                    setShowCustomModal(false);
                    handleStartHealing(customRepoUrl.trim());
                  }
                }}
                disabled={!customRepoUrl.trim()}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs disabled:opacity-50 transition"
              >
                Clone, Map & Heal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN PAGE CONTENT */}
      {activePage === 'studio' ? (
        <main className="max-w-7xl w-full mx-auto px-6 py-8 space-y-10">
          {/* SECTION 1: HERO & SYSTEM SELECTION */}
          <section className="space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-zinc-800/80 pb-5">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Powered by NVIDIA Nemotron 3 (Nano • Super • Ultra) on Nebius Token Factory + Tavily Live Search
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Autonomous Codebase X-Ray & Self-Healing Studio
                </h1>
                <p className="text-sm text-zinc-400 mt-1.5 max-w-3xl leading-relaxed">
                  Select any software system below to inspect its multi-file architecture, pinpoint breaking API deprecations or security CVEs, and watch our 4-tier AI cascade patch and verify 100% passing unit tests in real time.
                </p>
              </div>

              {/* Primary Hero CTA */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => handleStartHealing()}
                  disabled={isHealing}
                  className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 shadow-lg ${
                    isHealing
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20'
                  }`}
                >
                  {isHealing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Healing Repository Live...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Run Autonomous Heal on Selected System
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 1 Label */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-200 font-mono text-xs font-bold">
                  STEP 1
                </span>
                <h2 className="text-sm font-semibold text-zinc-200">
                  Choose a Software Architecture Scenario (No Login Required)
                </h2>
              </div>
              <span className="text-xs text-zinc-500 hidden sm:inline">
                Click any card to switch the architecture map below
              </span>
            </div>

            {/* 4 Clean Executive Scenario Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {scenarios.map((sc, i) => {
                const isSelected = sc.id === activeScenarioId;
                return (
                  <div
                    key={sc.id}
                    onClick={() => !isHealing && handleSelectScenario(sc.id)}
                    className={`rounded-2xl p-5 transition-all cursor-pointer border flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#131724] border-emerald-500/70 ring-1 ring-emerald-500/30 shadow-xl'
                        : 'bg-[#0d0f17] hover:bg-[#11141f] border-zinc-800/90'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {sc.badge}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" /> Active
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white leading-snug">
                        {i + 1}. {sc.name}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        {sc.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                        Fails in: {sc.target_file}
                      </span>
                      <button
                        type="button"
                        disabled={isHealing}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isHealing) handleStartHealing(sc.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Heal Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: VISUAL ARCHITECTURE & BLAST-RADIUS MAP */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-200 font-mono text-xs font-bold">
                  STEP 2
                </span>
                <h2 className="text-sm font-semibold text-zinc-200">
                  Inspect the Service Data-Flow & Downstream Blast Radius
                </h2>
              </div>
              <span className="text-xs text-zinc-400 hidden sm:inline">
                Click any stage card to inspect its data contracts or simulate a live fault
              </span>
            </div>

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
              onInspectCode={(fname) => {
                setActiveFilename(fname);
                setEditorTab(diffText ? 'diff' : 'source');
                document.getElementById('code-resolution-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              onInjectFault={handleInjectChaosFault}
              canShowHealed={true}
            />
          </section>

          {/* SECTION 3: 4-TIER AI PIPELINE & CODE RESOLUTION WORKSPACE */}
          <section id="code-resolution-section" className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-200 font-mono text-xs font-bold">
                  STEP 3
                </span>
                <h2 className="text-sm font-semibold text-zinc-200">
                  4-Tier AI Healing Pipeline, Live Code Diff & Sandbox Verification
                </h2>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                Status: {status === 'HEALED' ? '✅ 100% HEALED & VERIFIED' : status}
              </span>
            </div>

            {/* 5-Card Horizontal AI Step Tracker */}
            <AgentGraphLive
              currentNode={currentNode}
              completedNodes={completedNodes}
              status={status}
              telemetryHistory={telemetryHistory}
              stepTimings={stepTimings}
              confidenceScore={confidenceScore}
              skippedNodes={skippedNodes}
            />

            {/* AI Diagnosis & Architectural Plan Banner (When Available) */}
            {(triageData || refactoringPlan) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {triageData && (
                  <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0d0f17] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Cpu className="w-4 h-4" />
                        Tier 1: Nemotron 3 Nano 30B Triage Diagnosis
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Confidence: {(confidenceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{triageData.root_cause}</p>
                  </div>
                )}

                {refactoringPlan && (
                  <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-950/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                        <Brain className="w-4 h-4" />
                        Tier 3: Nemotron 3 Ultra 550B Blast-Radius Plan
                      </span>
                      <span className="text-xs font-mono text-purple-300/80">
                        Contracts Preserved
                      </span>
                    </div>
                    <div className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                      {refactoringPlan}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Spacious 2-Column Code Diff + Verification Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 cols: File Selector + Code / Diff / Tavily Viewer */}
              <div className="lg:col-span-7 rounded-2xl border border-zinc-800/90 bg-[#0d0f17] overflow-hidden flex flex-col h-[520px] shadow-xl">
                {/* File Selector Bar */}
                <div className="px-4 py-2.5 bg-[#11141f] border-b border-zinc-800 flex items-center gap-2 overflow-x-auto shrink-0">
                  <span className="text-xs text-zinc-400 font-medium mr-1">Files:</span>
                  {activeScenario?.files?.map((f) => (
                    <button
                      key={f.filename}
                      type="button"
                      onClick={() => {
                        setActiveFilename(f.filename);
                        setEditorTab('source');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition flex items-center gap-1.5 ${
                        activeFilename === f.filename
                          ? 'bg-zinc-800 text-white font-semibold border border-zinc-700'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {f.filename}
                      {f.is_target && (
                        <span className="w-2 h-2 rounded-full bg-red-400" title="Crash Target File" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-h-0">
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
              </div>

              {/* Right 5 cols: Pytest Verification Terminal + Nebius Token Factory Economics */}
              <div className="lg:col-span-5 flex flex-col gap-6 h-[520px]">
                <div className="h-1/2 rounded-2xl border border-zinc-800/90 overflow-hidden shadow-xl">
                  <TerminalOutput
                    initialOutput={initialTestOutput}
                    currentOutput={currentTestOutput}
                    baselineStderr={activeScenario?.baseline_stderr}
                    status={status}
                    isHealing={isHealing}
                  />
                </div>

                <div className="h-1/2 rounded-2xl border border-zinc-800/90 overflow-hidden shadow-xl">
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
          </section>

          {/* SECTION 4: RUNTIME MEMORY TIME-TRAVEL DEBUGGER */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-200 font-mono text-xs font-bold">
                STEP 4
              </span>
              <h2 className="text-sm font-semibold text-zinc-200">
                Time-Travel Payload Debugger (Inspect Variables Across Every Hop)
              </h2>
            </div>

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
          </section>
        </main>
      ) : activePage === 'benchmark' ? (
        <main className="max-w-7xl w-full mx-auto px-6 py-8">
          <BenchmarkTab activeScenarioId={activeScenarioId} />
        </main>
      ) : (
        /* PAGE 3: CLEAN ARCHITECTURE & HOW IT WORKS EXPLAINER */
        <main className="max-w-5xl w-full mx-auto px-6 py-12 space-y-10">
          <div className="text-center space-y-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-semibold">
              System Architecture Overview
            </span>
            <h1 className="text-3xl font-bold text-white">
              How PatchForge's 4-Tier Cascade Works
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Instead of burning frontier LLM tokens on every file or hallucinating outdated syntax, PatchForge combines static AST blast-radius mapping, live web grounding, and confidence-gated model routing on Nebius Token Factory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-zinc-800 bg-[#0d0f17] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Tier 1: High-Speed AST Triage (NVIDIA Nemotron 3 Nano 30B)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Uses `/no_think` instruction mode on Nebius Token Factory to scan failing `pytest` traces and AST nodes in under 200ms. Outputs a structured JSON diagnosis and a mathematical Confidence Score ($0.00 - 1.00$).
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-800 bg-[#0d0f17] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Tier 2: Live Documentation & CVE Grounding (Tavily Search API)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Whenever Tier 1 flags a breaking library upgrade or CVE below our 0.90 confidence gate, PatchForge queries Tavily Search API at runtime to retrieve official migration guides and NIST NVD advisories—eliminating training-cutoff hallucinations.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-800 bg-[#0d0f17] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Tier 3: Blast-Radius Architectural Planner (NVIDIA Nemotron 3 Ultra 550B)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Escalates to NVIDIA's frontier 550B hybrid MoE model only when confidence is below 0.85. Ultra inspects the downstream blast-radius contracts of all blocked modules so fixing Node B never breaks Node C or Node D.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-zinc-800 bg-[#0d0f17] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Tier 4: Surgical Diff Synthesis & Sandbox Loop (Nemotron 3 Super 120B)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Synthesizes unified Git diffs, applies them inside an isolated subprocess sandbox, re-runs `pytest -v --tb=short` with our runtime payload tracer active, and self-heals until 100% of unit tests turn green.
              </p>
            </div>
          </div>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => setActivePage('studio')}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg"
            >
              Launch Interactive Healing Studio <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
