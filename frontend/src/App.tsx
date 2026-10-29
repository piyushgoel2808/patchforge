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
  ThemeCustomizer,
  ThemeMode,
  CustomThemeColors,
  CURATED_PRESETS,
} from './components/ThemeCustomizer';
import {
  Shield,
  Wrench,
  BarChart3,
  Github,
  Play,
  Loader2,
  GitBranch,
  Plus,
  X,
  Network,
  Layers,
  Sparkles,
  CheckCircle2,
  Cpu,
  Globe,
  Brain,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FolderGit2,
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
  // 4 Primary Enterprise App Views:
  // 'xray' (Live Data-Flow Canvas + Time-Travel Slider + Blast-Radius Inspector + Chaos Injector)
  // 'workbench' (Repo Explorer + Unified/Split Code Diff + Tavily Citations + Pytest Console + Telemetry)
  // 'benchmark' (Nebius Cookbook #3 Cost & Latency Benchmark Matrix)
  // 'architecture' (4-Tier Cascade Architecture & API Health Diagnostics)
  const [activeView, setActiveView] = useState<'xray' | 'workbench' | 'benchmark' | 'architecture'>('xray');
  const [showFastTrackDrawer, setShowFastTrackDrawer] = useState<boolean>(false);

  // Multi-Theme State (Light / Dark / Custom Studio)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('pf_theme_mode') as ThemeMode;
    return saved || 'dark';
  });
  const [customColors, setCustomColors] = useState<CustomThemeColors>(() => {
    const saved = localStorage.getItem('pf_custom_colors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return CURATED_PRESETS[0];
  });

  useEffect(() => {
    localStorage.setItem('pf_theme_mode', themeMode);
    localStorage.setItem('pf_custom_colors', JSON.stringify(customColors));
    const root = document.documentElement;
    root.setAttribute('data-theme', themeMode);
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (themeMode === 'custom') {
      root.style.setProperty('--pf-bg', customColors.bg);
      root.style.setProperty('--pf-surface', customColors.surface);
      root.style.setProperty('--pf-card', customColors.card);
      root.style.setProperty('--pf-border', customColors.border);
      root.style.setProperty('--pf-text', customColors.text);
      root.style.setProperty('--pf-muted', customColors.muted);
      root.style.setProperty('--pf-accent', customColors.accent);
      root.style.setProperty('--pf-accent-hover', customColors.accent);
    } else {
      root.style.removeProperty('--pf-bg');
      root.style.removeProperty('--pf-surface');
      root.style.removeProperty('--pf-card');
      root.style.removeProperty('--pf-border');
      root.style.removeProperty('--pf-text');
      root.style.removeProperty('--pf-muted');
      root.style.removeProperty('--pf-accent');
      root.style.removeProperty('--pf-accent-hover');
    }
  }, [themeMode, customColors]);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario:repo_1_pydantic_v2');
  const [activeFilename, setActiveFilename] = useState<string>('models.py');

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
  const [intelligence, setIntelligence] = useState<any>(null);

  const [editorTab, setEditorTab] = useState<'source' | 'diff' | 'citations' | 'repro'>('source');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customRepoUrl, setCustomRepoUrl] = useState<string>('');

  const [isHealing, setIsHealing] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('IDLE');
  const [currentNode, setCurrentNode] = useState<string>('');
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [skippedNodes, setSkippedNodes] = useState<string[]>([]);
  const [stepTimings, setStepTimings] = useState<Record<string, number>>({});

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
    if (data.intelligence) setIntelligence(data.intelligence);
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

    if (activeView === 'benchmark' || activeView === 'architecture') {
      setActiveView('xray');
    }
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
    <div className="h-screen w-screen overflow-hidden flex pf-bg pf-text select-none">
      {/* 1. LEFT ENTERPRISE NAVIGATION SIDEBAR (Linear / Datadog / Sentry App Shell) */}
      <aside className="w-64 shrink-0 border-r pf-border pf-card flex flex-col justify-between z-30">
        <div className="p-4 space-y-5 overflow-y-auto">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 pb-3 border-b pf-border">
            <div className="w-9 h-9 rounded-xl pf-accent-bg flex items-center justify-center shadow-sm shrink-0">
              <Shield className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight pf-text truncate">
                  PatchForge v2.0
                </span>
              </div>
              <span className="text-[10px] font-mono pf-accent-text font-semibold block truncate">
                {isLiveApi ? '● Live Nebius + Tavily' : '● Nebius Token Factory'}
              </span>
            </div>
          </div>

          {/* Primary Platform Modules (Guided 1 -> 4 Navigation) */}
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider pf-muted font-bold block mb-1.5">
              Platform Workspace
            </span>

            <button
              type="button"
              onClick={() => setActiveView('xray')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                activeView === 'xray'
                  ? 'pf-accent-bg shadow-sm'
                  : 'pf-muted hover:pf-text hover:pf-surface'
              }`}
            >
              <span className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                1. Live Data-Flow X-Ray
              </span>
              <span className="text-[10px] font-mono opacity-80">Graph</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('workbench')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                activeView === 'workbench'
                  ? 'pf-accent-bg shadow-sm'
                  : 'pf-muted hover:pf-text hover:pf-surface'
              }`}
            >
              <span className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                2. Code Diff & IDE
              </span>
              {diffText ? (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500 text-white">
                  Patched
                </span>
              ) : (
                <span className="text-[10px] font-mono opacity-80">Diff</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveView('benchmark')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                activeView === 'benchmark'
                  ? 'pf-accent-bg shadow-sm'
                  : 'pf-muted hover:pf-text hover:pf-surface'
              }`}
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                3. Cost Benchmarks
              </span>
              <span className="text-[10px] font-mono opacity-80">-68.4%</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('architecture')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                activeView === 'architecture'
                  ? 'pf-accent-bg shadow-sm'
                  : 'pf-muted hover:pf-text hover:pf-surface'
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                4. Cascade Architecture
              </span>
            </button>
          </div>

          {/* Target Software Systems (4 Multi-File Domain Repos + Custom Git URL) */}
          <div className="space-y-1.5 pt-2 border-t pf-border">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider pf-muted font-bold">
                Target Systems (4)
              </span>
              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                className="text-[10px] font-bold pf-accent-text hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Git URL
              </button>
            </div>

            {scenarios.map((sc, idx) => {
              const isSelected = sc.id === activeScenarioId;
              return (
                <button
                  key={sc.id}
                  type="button"
                  disabled={isHealing}
                  onClick={() => handleSelectScenario(sc.id)}
                  className={`w-full p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    isSelected
                      ? 'pf-surface pf-accent-border shadow-sm'
                      : 'border-transparent hover:pf-surface opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold pf-text truncate">
                      {idx + 1}. {sc.name}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 pf-accent-text shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="pf-muted truncate">{sc.library}</span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/25">
                      {sc.target_file}
                    </span>
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              disabled={isHealing}
              onClick={() => setShowCustomModal(true)}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-dashed pf-border hover:pf-surface text-xs font-semibold pf-muted hover:pf-text flex items-center justify-center gap-1.5 transition"
            >
              <FolderGit2 className="w-3.5 h-3.5 pf-accent-text" />
              Clone Custom GitHub Repo
            </button>
          </div>
        </div>

        {/* Sidebar Bottom Footer */}
        <div className="p-3.5 border-t pf-border pf-surface space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="pf-muted font-medium">Nebius Models:</span>
            <span className="font-mono font-bold pf-accent-text">Nano • Super • Ultra</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="pf-muted font-medium">Web Grounding:</span>
            <span className="font-mono font-bold text-sky-500">Tavily Search API</span>
          </div>
        </div>
      </aside>

      {/* 2. MAIN ENTERPRISE CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Command Header Bar */}
        <header className="h-14 shrink-0 border-b pf-border pf-card px-5 flex items-center justify-between gap-4 z-20">
          {/* Active System Breadcrumb + Fast-Track Drawer Toggle */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase font-bold pf-accent-text">
                  {activeScenario?.badge || 'Active System'}
                </span>
                <span className="pf-muted">•</span>
                <h1 className="text-sm font-extrabold pf-text truncate">
                  {activeScenario?.title || domainType}
                </h1>
              </div>
              <p className="text-[11px] pf-muted truncate">
                {activeScenario?.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowFastTrackDrawer((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg pf-surface border pf-border text-[11px] font-semibold pf-accent-text flex items-center gap-1 shrink-0 hover:opacity-90"
              title="Toggle 4-Scenario Fast-Track Cards"
            >
              <Sparkles className="w-3 h-3" />
              Fast-Track Cards
              {showFastTrackDrawer ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Right: Primary Auto-Heal CTA + Light/Dark/Custom Theme Studio + GitHub */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleStartHealing()}
              disabled={isHealing}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
                isHealing
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 cursor-not-allowed'
                  : 'pf-accent-bg'
              }`}
            >
              {isHealing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Healing Pipeline Live...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  ⚡ Run Autonomous Heal
                </>
              )}
            </button>

            <ThemeCustomizer
              themeMode={themeMode}
              customColors={customColors}
              onChangeMode={setThemeMode}
              onChangeCustomColors={setCustomColors}
            />

            <a
              href="https://github.com/piyushgoel2808/patchforge"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl pf-surface hover:opacity-85 pf-muted hover:pf-text border pf-border transition"
              title="GitHub Repository"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </header>

        {/* Collapsible Judge Fast-Track 4-Card Modal Overlay (Does NOT push workspace down!) */}
        {showFastTrackDrawer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-14 p-4 overflow-y-auto">
            <div className="w-full max-w-6xl shadow-2xl rounded-2xl overflow-hidden border pf-border">
              <JudgeFastTrack
                scenarios={scenarios}
                activeScenarioId={activeScenarioId}
                isRunning={isHealing}
                onSelectScenario={(id) => {
                  handleSelectScenario(id);
                  setShowFastTrackDrawer(false);
                }}
                onStartHealing={(target) => {
                  setShowFastTrackDrawer(false);
                  handleStartHealing(target);
                }}
                onClose={() => setShowFastTrackDrawer(false)}
              />
            </div>
          </div>
        )}

        {/* Persistent 5-Stage AI Cascade Progress Ribbon */}
        <AgentGraphLive
          currentNode={currentNode}
          completedNodes={completedNodes}
          status={status}
          telemetryHistory={telemetryHistory}
          stepTimings={stepTimings}
          confidenceScore={confidenceScore}
          skippedNodes={skippedNodes}
        />

        {/* Custom GitHub URL Modal */}
        {showCustomModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="pf-card border pf-border rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold pf-text flex items-center gap-2">
                  <GitBranch className="w-4 h-4 pf-accent-text" />
                  Connect Custom GitHub Repository
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="pf-muted hover:pf-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs pf-muted leading-relaxed">
                Paste any public GitHub repository URL containing Python modules and a `pytest` suite. PatchForge will clone it into an isolated sandbox, map its AST data-flow graph, and autonomously patch failing unit tests:
              </p>
              <input
                type="text"
                placeholder="https://github.com/owner/repository"
                value={customRepoUrl}
                onChange={(e) => setCustomRepoUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 pf-surface border pf-border rounded-xl text-xs font-mono pf-text focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 text-xs pf-muted hover:pf-text"
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
                  className="px-5 py-2 pf-accent-bg font-bold rounded-xl text-xs disabled:opacity-50 transition"
                >
                  Clone, Map & Heal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. ACTIVE WORKSPACE VIEW */}
        {activeView === 'xray' ? (
          /* VIEW 1: LIVE DATA-FLOW X-RAY + TIME-TRAVEL DEBUGGER + BLAST-RADIUS INSPECTOR + CHAOS INJECTOR */
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-3 overflow-hidden">
            {/* Left / Center 8 cols: Animated SVG Data-Flow Canvas (flex-1) + Time-Travel Payload Replay Slider */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-3 min-h-0 h-full">
              <div className="flex-1 min-h-[260px] flex flex-col">
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
                    setActiveView('workbench');
                  }}
                  onQuickChaos={(nid) => {
                    handleInjectChaosFault(nid, 'breaking_schema', false);
                  }}
                  canShowHealed={true}
                />
              </div>

              <div className="h-[210px] shrink-0 flex flex-col">
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

            {/* Right 4 cols: Docked Blast-Radius Inspector + Interactive Chaos Fault Injector */}
            <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0 h-full rounded-2xl border pf-border pf-card overflow-hidden shadow-sm">
              <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                <BlastRadiusInspector
                  selectedNode={selectedNodeObj}
                  allNodes={topologyNodes}
                  isHealed={flowViewState === 'healed' || status === 'HEALED'}
                  triageData={triageData}
                  refactoringPlan={refactoringPlan}
                  safetyInvariants={intelligence?.safety_invariants || []}
                  onSelectNode={(nid) => setSelectedNodeId(nid)}
                  onOpenCodeFile={(fname) => {
                    setActiveFilename(fname);
                    setEditorTab(diffText ? 'diff' : 'source');
                    setActiveView('workbench');
                  }}
                />
              </div>

              <div className="shrink-0 border-t pf-border">
                <ChaosFaultInjector
                  nodes={topologyNodes}
                  selectedNodeId={selectedNodeId}
                  isHealing={isHealing}
                  onInjectFault={handleInjectChaosFault}
                />
              </div>
            </div>
          </div>
        ) : activeView === 'workbench' ? (
          /* VIEW 2: FULL CODE DIFF & SANDBOX IDE WORKBENCH */
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-3 overflow-hidden">
            <div className="col-span-3 flex flex-col min-h-0 h-full rounded-2xl border pf-border overflow-hidden">
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

            <div className="col-span-5 flex flex-col min-h-0 h-full rounded-2xl border pf-border overflow-hidden">
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
                intelligence={intelligence}
              />
            </div>

            <div className="col-span-4 flex flex-col gap-3 min-h-0 h-full">
              <div className="h-1/2 min-h-0 flex flex-col rounded-2xl border pf-border overflow-hidden">
                <TerminalOutput
                  initialOutput={initialTestOutput}
                  currentOutput={currentTestOutput}
                  baselineStderr={activeScenario?.baseline_stderr}
                  status={status}
                  isHealing={isHealing}
                />
              </div>

              <div className="h-1/2 min-h-0 flex flex-col rounded-2xl border pf-border overflow-hidden">
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
        ) : activeView === 'benchmark' ? (
          /* VIEW 3: NEBIUS AGENT COST & LATENCY BENCHMARK SUITE */
          <div className="flex-1 overflow-y-auto p-6">
            <BenchmarkTab activeScenarioId={activeScenarioId} />
          </div>
        ) : (
          /* VIEW 4: CASCADE ARCHITECTURE & SYSTEM HEALTH */
          <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto space-y-8">
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full pf-accent-tint border text-xs font-bold">
                Platform Architecture
              </span>
              <h2 className="text-2xl font-extrabold pf-text">
                How PatchForge's 4-Tier Cascade & Runtime Tracer Work
              </h2>
              <p className="text-sm pf-muted leading-relaxed">
                PatchForge combines Universal Static AST Blast-Radius Mapping, `sys.settrace` Runtime Payload Inspection, Live Tavily Documentation Grounding, and Confidence-Gated NVIDIA Nemotron 3 Routing on Nebius Token Factory.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl border pf-card space-y-2.5">
                <div className="w-9 h-9 rounded-xl pf-accent-tint border flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold pf-text">
                  Tier 1: High-Speed AST Triage (NVIDIA Nemotron 3 Nano 30B)
                </h3>
                <p className="text-xs pf-muted leading-relaxed">
                  Executes in `/no_think` instruction mode on Nebius Token Factory to triage the crash hop, incoming payload snapshot, and traceback in under 200ms, outputting a mathematical Confidence Score ($0.00 - 1.00$).
                </p>
              </div>

              <div className="p-5 rounded-2xl border pf-card space-y-2.5">
                <div className="w-9 h-9 rounded-xl pf-accent-tint border flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold pf-text">
                  Tier 2: Live Documentation & CVE Grounding (Tavily Search API)
                </h3>
                <p className="text-xs pf-muted leading-relaxed">
                  Whenever Tier 1 flags a breaking SDK migration or security CVE below our 0.90 confidence gate, PatchForge queries Tavily Search API at runtime to pull official migration guides and NVD advisories.
                </p>
              </div>

              <div className="p-5 rounded-2xl border pf-card space-y-2.5">
                <div className="w-9 h-9 rounded-xl pf-accent-tint border flex items-center justify-center">
                  <Brain className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold pf-text">
                  Tier 3: Blast-Radius Planner (NVIDIA Nemotron 3 Ultra 550B)
                </h3>
                <p className="text-xs pf-muted leading-relaxed">
                  Escalates to NVIDIA's frontier 550B hybrid MoE model when confidence is below 0.85, inspecting the downstream data contracts of all starved nodes in the blast radius to guarantee zero regressions.
                </p>
              </div>

              <div className="p-5 rounded-2xl border pf-card space-y-2.5">
                <div className="w-9 h-9 rounded-xl pf-accent-tint border flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold pf-text">
                  Tier 4: Surgical Diff Synthesis & Re-Trace Loop (Nemotron 3 Super 120B)
                </h3>
                <p className="text-xs pf-muted leading-relaxed">
                  Synthesizes unified Git diffs, applies them inside an isolated subprocess sandbox, re-runs `pytest -v --tb=short` with the Runtime Tracer active, and verifies 100% passing unit tests.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveView('xray')}
                className="px-5 py-2.5 rounded-xl pf-accent-bg font-bold text-xs inline-flex items-center gap-2 shadow-md"
              >
                Open Live Data-Flow X-Ray <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
