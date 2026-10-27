"""LangGraph execution nodes for PatchForge 4-Tier Agentic Cascade."""

import json
import logging
from typing import Dict, Any, List
from backend.agent.state import PatchForgeState
from backend.core.nebius_client import nebius_client
from backend.core.tavily_grounding import tavily_service
from backend.core.sandbox_runner import sandbox_runner
from backend.config import settings

logger = logging.getLogger("patchforge.nodes")


def _record_telemetry(state: PatchForgeState, telem_dict: Dict[str, Any]):
    """Helper to accumulate telemetry steps and dollar savings."""
    state.setdefault("telemetry_steps", []).append(telem_dict)
    state["cumulative_cost_usd"] = round(state.get("cumulative_cost_usd", 0.0) + telem_dict.get("cost_usd", 0.0), 6)
    state["cumulative_ultra_baseline_cost_usd"] = round(
        state.get("cumulative_ultra_baseline_cost_usd", 0.0) + telem_dict.get("monolithic_ultra_cost_usd", 0.0), 6
    )
    state["cumulative_dollars_saved_usd"] = round(
        max(0.0, state["cumulative_ultra_baseline_cost_usd"] - state["cumulative_cost_usd"]), 6
    )
    state["total_tokens"] = state.get("total_tokens", 0) + telem_dict.get("total_tokens", 0)


async def run_initial_tests_node(state: PatchForgeState) -> PatchForgeState:
    """Execute baseline pytest in the isolated sandbox to capture initial failure."""
    logger.info("Node: run_initial_tests_node in workspace %s", state["workspace_dir"])
    res = await sandbox_runner.run_tests(state["workspace_dir"])

    state["initial_test_output"] = res.to_dict()
    state["current_test_output"] = res.to_dict()
    state["status"] = "TRIAGING"

    # Extract failing files and error signature from stderr
    stderr = res.stderr or res.stdout
    lines = stderr.splitlines()
    error_sig_lines = [l for l in lines if "Error:" in l or "FAILED" in l or "Exception" in l or "assert" in l]
    state["error_signature"] = "\n".join(error_sig_lines[-6:]) if error_sig_lines else stderr[:300]

    return state


async def triage_with_nano_node(state: PatchForgeState) -> PatchForgeState:
    """Tier 1: High-Speed AST Triage & Confidence Gate via NVIDIA Nemotron 3 Nano 30B."""
    logger.info("Node: triage_with_nano_node")
    workspace_files = sandbox_runner.read_workspace_files(state["workspace_dir"])
    files_summary = "\n".join([f"--- {p} ---\n{c[:400]}" for p, c in workspace_files.items()])

    prompt = f"""You are an elite code diagnostic engine. Triage this failing test trace and repository AST.
Output strict JSON with keys:
- root_cause (str)
- library (str)
- target_version (str)
- deprecated_symbols (list of str)
- confidence (float between 0.00 and 1.00)
- needs_web_docs (bool)

Failing stderr:
{state['current_test_output'].get('stderr', '')[:800]}

Repository files snippet:
{files_summary[:1200]}
"""

    messages = [
        {"role": "system", "content": "You are a fast AST triage system. Output ONLY valid JSON."},
        {"role": "user", "content": prompt}
    ]

    result = await nebius_client.generate(
        tier="nano",
        messages=messages,
        temperature=0.1,
        max_tokens=600
    )

    telem = result.to_dict()
    _record_telemetry(state, telem)

    # Parse JSON output from Nano
    try:
        raw_json = result.content.strip()
        # Strip markdown fences if present
        if raw_json.startswith("```"):
            raw_json = raw_json.split("\n", 1)[1]
            if raw_json.endswith("```"):
                raw_json = raw_json.rsplit("```", 1)[0]
        data = json.loads(raw_json)
    except Exception:
        # Fallback parsing
        data = {
            "root_cause": "Dependency deprecation or security vulnerability detected",
            "library": "unknown",
            "target_version": "latest",
            "deprecated_symbols": [],
            "confidence": 0.60,
            "needs_web_docs": True
        }

    state["root_cause"] = data.get("root_cause", "")
    state["library_name"] = data.get("library", "python")
    state["target_version"] = data.get("target_version", "")
    state["deprecated_symbols"] = data.get("deprecated_symbols", [])
    state["confidence"] = float(data.get("confidence", 0.60))
    state["needs_web_docs"] = bool(data.get("needs_web_docs", True))
    state["status"] = "GROUNDING" if (state["needs_web_docs"] or state["confidence"] < settings.confidence_threshold_docs) else "PLANNING"

    return state


async def ground_with_tavily_node(state: PatchForgeState) -> PatchForgeState:
    """Tier 2: Live Documentation & CVE Grounding via Tavily Search & Extract API."""
    logger.info("Node: ground_with_tavily_node for library %s", state["library_name"])

    grounding = await tavily_service.fetch_migration_and_cve_docs(
        error_signature=state["error_signature"],
        library_name=state["library_name"],
        target_version=state["target_version"],
        symbols=state["deprecated_symbols"]
    )

    state["tavily_citations"] = grounding.citations
    state["tavily_summary"] = grounding.summary
    state["status"] = "PLANNING"

    return state


async def plan_with_ultra_node(state: PatchForgeState) -> PatchForgeState:
    """Tier 3: Deep Architectural Planning via NVIDIA Nemotron 3 Ultra 550B."""
    logger.info("Node: plan_with_ultra_node (Escalation / Low Confidence / Retry %d)", state["retry_count"])
    workspace_files = sandbox_runner.read_workspace_files(state["workspace_dir"])
    full_files = "\n".join([f"=== File: {p} ===\n{c}" for p, c in workspace_files.items()])

    citations_text = "\n".join([f"- [{c['title']}]({c['url']}): {c['snippet']}" for c in state.get("tavily_citations", [])])

    prompt = f"""You are NVIDIA Nemotron 3 Ultra 550B, the deep architectural reasoning agent for PatchForge.
Develop a step-by-step refactoring plan to fix all failing unit tests and CVEs.

Root Cause: {state['root_cause']}
Deprecated Symbols: {state['deprecated_symbols']}
Retry Attempt: {state['retry_count']}

Latest Test Failure Output:
{state['current_test_output'].get('stderr', '')[:800]}

Grounded Documentation (via Tavily Live Search):
{citations_text}

Repository Files:
{full_files[:3000]}

Produce a concrete, bulleted architectural refactoring plan specifying exactly what imports, decorators, and methods to change.
"""

    messages = [
        {"role": "system", "content": "You are a master software architect specializing in backward-compatible refactoring."},
        {"role": "user", "content": prompt}
    ]

    result = await nebius_client.generate(
        tier="ultra",
        messages=messages,
        temperature=0.2,
        max_tokens=1500
    )

    telem = result.to_dict()
    _record_telemetry(state, telem)

    state["refactoring_plan"] = result.content
    state["status"] = "PATCHING"

    return state


async def synthesize_patch_with_super_node(state: PatchForgeState) -> PatchForgeState:
    """Tier 4: Code Synthesis & Unified Git Diff Generation via NVIDIA Nemotron 3 Super 120B."""
    logger.info("Node: synthesize_patch_with_super_node")
    workspace_files = sandbox_runner.read_workspace_files(state["workspace_dir"])
    full_files = "\n".join([f"=== File: {p} ===\n{c}" for p, c in workspace_files.items()])

    prompt = f"""You are NVIDIA Nemotron 3 Super 120B, the code synthesis engine for PatchForge.
Write complete, bug-free, modern replacements for the affected files to make 100% of unit tests pass.

Refactoring Plan:
{state.get('refactoring_plan', 'Apply direct backward-compatible fix based on root cause')}

Current Workspace Files:
{full_files[:3500]}

Output strict JSON:
{{
  "explanation": "Brief explanation of the fixes",
  "files": {{
     "path/to/file.py": "COMPLETE full file content with fixes applied"
  }}
}}
"""

    messages = [
        {"role": "system", "content": "You are an expert code synthesis engine. Output ONLY valid JSON containing complete file replacements."},
        {"role": "user", "content": prompt}
    ]

    result = await nebius_client.generate(
        tier="super",
        messages=messages,
        temperature=0.1,
        max_tokens=3000
    )

    telem = result.to_dict()
    _record_telemetry(state, telem)

    # Parse synthesized files
    try:
        raw_json = result.content.strip()
        if raw_json.startswith("```"):
            raw_json = raw_json.split("\n", 1)[1]
            if raw_json.endswith("```"):
                raw_json = raw_json.rsplit("```", 1)[0]
        data = json.loads(raw_json)
        files_to_update = data.get("files", {})
    except Exception as e:
        logger.warning("Could not parse Super JSON patch: %s. Using fallback content.", str(e))
        # Use fallback synthesized patch
        fallback_res = nebius_client._generate_simulated_patch_content(state.get("root_cause", ""))
        files_to_update = json.loads(fallback_res).get("files", {})

    state["patched_files"] = files_to_update

    # Apply to workspace and compute diffs
    success, diffs, combined_diff = sandbox_runner.apply_patch(state["workspace_dir"], files_to_update)
    state["unified_diffs"] = diffs
    state["combined_diff"] = combined_diff
    state["status"] = "VERIFYING"

    return state


async def verify_patch_in_sandbox_node(state: PatchForgeState) -> PatchForgeState:
    """Verify synthesized patch by re-running pytest in the sandbox."""
    logger.info("Node: verify_patch_in_sandbox_node (Attempt %d)", state["retry_count"])
    res = await sandbox_runner.run_tests(state["workspace_dir"])

    state["current_test_output"] = res.to_dict()

    if res.success:
        state["status"] = "HEALED"
        state["final_success"] = True
        state["message"] = f"Repository successfully healed! 100% of unit tests passed in {res.duration_sec:.2f}s."
    else:
        state["retry_count"] += 1
        if state["retry_count"] >= settings.max_healing_retries:
            state["status"] = "FAILED"
            state["final_success"] = False
            state["message"] = f"Healing loop reached maximum retries ({settings.max_healing_retries}). Escalation review required."
        else:
            state["status"] = "PLANNING"  # Loop back to Ultra planner with new error trace
            state["error_signature"] = res.stderr[-400:] if res.stderr else res.stdout[-400:]
            state["message"] = f"Tests failed on attempt {state['retry_count']}. Self-healing feedback loop initiated."

    return state
