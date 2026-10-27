"""LangGraph state definitions and telemetry tracking schemas for PatchForge."""

from typing import TypedDict, List, Dict, Any, Optional
from pydantic import BaseModel, Field


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


class PatchForgeState(TypedDict):
    """The central state of the LangGraph healing pipeline."""

    # Target & Workspace
    target: str                           # Scenario name or git URL
    workspace_dir: str                   # Temp directory where code resides
    retry_count: int                     # Retries attempted so far
    status: str                          # INITIALIZING | TRIAGING | GROUNDING | PLANNING | PATCHING | VERIFYING | HEALED | FAILED

    # Test Execution Data
    initial_test_output: Dict[str, Any]  # Baseline pytest output
    current_test_output: Dict[str, Any]  # Latest pytest output
    failing_files: List[str]             # Files associated with errors
    error_signature: str                 # Extracted core traceback snippet

    # Tier 1: Nano Triage Output
    root_cause: str                      # High-level diagnosis
    library_name: str                    # Upstream library affected
    target_version: str                  # Detected version bump
    deprecated_symbols: List[str]        # Specific methods/symbols flagged
    confidence: float                    # 0.00 - 1.00
    needs_web_docs: bool                 # Trigger for Tavily grounding

    # Tier 2: Tavily Grounding Output
    tavily_citations: List[Dict[str, Any]]
    tavily_summary: str

    # Tier 3: Ultra Planning Output
    refactoring_plan: str                # Step-by-step multi-file refactoring instructions

    # Tier 4: Super Synthesis Output
    patched_files: Dict[str, str]        # { "relative/path.py": "new_content" }
    unified_diffs: Dict[str, str]        # { "relative/path.py": "diff_text" }
    combined_diff: str                   # Combined unified git diff text

    # Real-Time Telemetry Log
    telemetry_steps: List[Dict[str, Any]]
    cumulative_cost_usd: float
    cumulative_ultra_baseline_cost_usd: float
    cumulative_dollars_saved_usd: float
    total_tokens: int
    duration_ms: float
    final_success: bool
    message: str
