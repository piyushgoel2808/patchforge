import React, { useState, useEffect } from 'react';
import { JudgeFastTrack } from './components/JudgeFastTrack';
import { AgentGraphLive } from './components/AgentGraphLive';
import { DiffViewer } from './components/DiffViewer';
import { TerminalOutput } from './components/TerminalOutput';
import { TelemetryHUD } from './components/TelemetryHUD';
import { BenchmarkTab } from './components/BenchmarkTab';
import { Shield, Sparkles, Wrench, BarChart3, Github, Cpu, ExternalLink } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'benchmark'>('studio');
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario:repo_1_pydantic_v2');

  // Pipeline Execution State
  const [isHealing, setIsHealing] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('IDLE');
  const [currentNode, setCurrentNode] = useState<string>('');
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);

  // Agent Artifacts
  const [initialTestOutput, setInitialTestOutput] = useState<any>(null);
  const [currentTestOutput, setCurrentTestOutput] = useState<any>(null);
  const [diffText, setDiffText] = useState<string>('');
  const [tavilyCitations, setTavilyCitations] = useState<any[]>([]);
  const [tavilySummary, setTavilySummary] = useState<string>('');
  const [refactoringPlan, setRefactoringPlan] = useState<string>('');
  const [triageData, setTriageData] = useState<any>(null);
  const [prSuccessUrl, setPrSuccessUrl] = useState<string>('');

  // Telemetry
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
  const [latestTelemetry, setLatestTelemetry] = useState<any>(null);
  const [confidenceScore, setConfidenceScore] = useState<number>(0.65);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [cumulativeCost, setCumulativeCost] = useState<number>(0);
  const [cumulativeSavings, setCumulativeSavings] = useState<number>(0);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const res = await fetch('/api/scenarios');
      const data = await res.json();
      setScenarios(data.scenarios || []);
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    }
  };

  const handleStartHealing = async (target: string) => {
    setIsHealing(true);
    setStatus('INITIALIZING');
    setCurrentNode('run_initial_tests');
    setCompletedNodes([]);
    setDiffText('');
    setTavilyCitations([]);
    setTavilySummary('');
    setRefactoringPlan('');
    setTelemetryHistory([]);
    setLatestTelemetry(null);
    setInitialTestOutput(null);
    setCurrentTestOutput(null);
    setPrSuccessUrl('');
    setCumulativeCost(0);
    setCumulativeSavings(0);
    setTotalTokens(0);

    try {
      const response = await fetch('/api/heal/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
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
        break;

      case 'node_start':
        setCurrentNode(data.node);
        break;

      case 'node_complete':
        setCompletedNodes((prev) => [...prev, data.node]);

        if (data.node === 'run_initial_tests') {
          setInitialTestOutput(data.test_output);
          setCurrentTestOutput(data.test_output);
        } else if (data.node === 'triage_with_nano') {
          setTriageData(data);
          setConfidenceScore(data.confidence || 0.65);
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
          setStatus(data.status);
        }
        break;

      case 'workflow_complete':
        setStatus(data.status);
        setDiffText(data.combined_diff || diffText);
        setCumulativeCost(data.total_cost_usd || 0);
        setCumulativeSavings(data.total_dollars_saved || 0);
        setTotalTokens(data.total_tokens || 0);
        break;

      case 'workflow_error':
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
          repo_name: 'patchforge-demo',
          patch_content: diffText,
        }),
      });
      const data = await res.json();
      if (data.pr_url) {
        setPrSuccessUrl(data.pr_url);
      }
    } catch (err) {
      console.error('Error exporting PR:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-[#0b101c]/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/25">
              <Shield className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white">PatchForge</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  v1.0 Hackathon Release
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Confidence-Gated Autonomous Repo Healer • Nebius Token Factory × NVIDIA Nemotron 3
              </p>
            </div>
          </div>

          {/* Tab Selector & GitHub Link */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('studio')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'studio'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Autonomous Studio
              </button>
              <button
                onClick={() => setActiveTab('benchmark')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'benchmark'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Cost Benchmark Tab
              </button>
            </div>

            <a
              href="https://github.com/piyushgoel2808/patchforge"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              title="View GitHub Repository"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-6 flex-1 w-full space-y-6">
        {activeTab === 'studio' ? (
          <>
            {/* 1. Judge Fast-Track 1-Click Cards */}
            <JudgeFastTrack
              scenarios={scenarios}
              activeScenarioId={activeScenarioId}
              isRunning={isHealing}
              onSelectScenario={setActiveScenarioId}
              onStartHealing={handleStartHealing}
            />

            {/* 2. Live Agent Pipeline Visualization */}
            <AgentGraphLive
              currentNode={currentNode}
              completedNodes={completedNodes}
              status={status}
              triageData={triageData}
            />

            {/* 3. Center Split Workspace & Telemetry Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[560px]">
              {/* Left: Diff Viewer & Tavily Citations (5 cols) */}
              <div className="lg:col-span-5 h-full">
                <DiffViewer
                  diffText={diffText}
                  citations={tavilyCitations}
                  tavilySummary={tavilySummary}
                  refactoringPlan={refactoringPlan}
                  onExportPR={handleExportPR}
                  prSuccessUrl={prSuccessUrl}
                />
              </div>

              {/* Center: Live Terminal Output (4 cols) */}
              <div className="lg:col-span-4 h-full">
                <TerminalOutput
                  initialOutput={initialTestOutput}
                  currentOutput={currentTestOutput}
                  status={status}
                  isHealing={isHealing}
                />
              </div>

              {/* Right: Telemetry HUD (3 cols) */}
              <div className="lg:col-span-3 h-full">
                <TelemetryHUD
                  latestTelemetry={latestTelemetry}
                  telemetryHistory={telemetryHistory}
                  confidenceScore={confidenceScore}
                  totalTokens={totalTokens}
                  cumulativeCost={cumulativeCost}
                  cumulativeSavings={cumulativeSavings}
                />
              </div>
            </div>
          </>
        ) : (
          <BenchmarkTab activeScenarioId={activeScenarioId} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#080c14] py-4 text-center text-xs text-slate-500 font-mono">
        Nebius x NVIDIA Global AI Hackathon • Built with Nebius Token Factory, NVIDIA Nemotron 3 & Tavily Live Web Grounding
      </footer>
    </div>
  );
}
