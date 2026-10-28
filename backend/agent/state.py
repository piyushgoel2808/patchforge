"""LangGraph state definitions and telemetry tracking schemas for PatchForge v2.0."""

from typing import TypedDict, List, Dict, Any, Optional
from pydantic import BaseModel


class AgentTelemetry(BaseModel):
    """Cumulative and per-step telemetry metrics."""
    tier: str = "nano"
    model_id: str = ""
    step_latency_ms: float = 0.0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    tokens_per_sec: float = 0.0
    cost_usd: float = 0.0
    monolithic_ultra_cost_usd: float = 0.0
    dollars_saved_usd: float = 0.0
    confidence_score: float = 0.0


class PatchForgeState(TypedDict, total=False):
    """The central state of the compiled LangGraph healing pipeline (v2.0 Data-Flow & Blast-Radius)."""

    # Target & Workspace
    target: str                           # Scenario name or git URL
    workspace_dir: str                    # Temp directory where code resides
    retry_count: int                      # Retries attempted so far
    status: str                           # INITIALIZING | TRIAGING | GROUNDING | PLANNING | PATCHING | VERIFYING | HEALED | FAILED
    execution_mode: str                   # LIVE_API | SIMULATED_FALLBACK

    # Data-Flow Topology & Runtime Payload Traces (v2.0 X-Ray Engine)
    dataflow_topology: Dict[str, Any]     # Nodes, layers, call edges, blast-radius & criticality scores
    execution_traces: Dict[str, Any]      # initial_broken_trace & healed_verified_trace hops
    chaos_fault: Optional[Dict[str, Any]] # Active Chaos Fault injection metadata if triggered

    # Test Execution Data
    initial_test_output: Dict[str, Any]   # Baseline pytest output
    current_test_output: Dict[str, Any]   # Latest pytest output
    failing_files: List[str]              # Files associated with errors
    error_signature: str                  # Extracted core traceback snippet

    # Tier 1: Nano Triage Output
    root_cause: str                       # High-level diagnosis
    library_name: str                     # Upstream library affected
    target_version: str                   # Detected version bump
    deprecated_symbols: List[str]         # Specific methods/symbols flagged
    confidence: float                     # 0.00 - 1.00
    needs_web_docs: bool                  # Trigger for Tavily grounding

    # Tier 2: Tavily Grounding Output
    tavily_citations: List[Dict[str, Any]]
    tavily_summary: str
    tavily_is_live: bool

    # Tier 3: Ultra Planning Output
    refactoring_plan: str                 # Step-by-step blast-radius-aware refactoring instructions

    # Tier 4: Super Synthesis Output
    patch_explanation: str                # Summary explanation of the synthesized patch
    patched_files: Dict[str, str]         # { "relative/path.py": "new_content" }
    unified_diffs: Dict[str, str]         # { "relative/path.py": "diff_text" }
    combined_diff: str                    # Combined unified git diff text

    # Real-Time Telemetry & Step Timings Log
    telemetry_steps: List[Dict[str, Any]]
    step_timings: Dict[str, float]        # { "node_name": latency_ms }
    skipped_nodes: List[str]              # Nodes bypassed via confidence gate
    cumulative_cost_usd: float
    cumulative_ultra_baseline_cost_usd: float
    cumulative_dollars_saved_usd: float
    total_tokens: int
    duration_ms: float
    final_success: bool
    message: str
