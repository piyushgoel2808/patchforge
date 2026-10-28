"""LangGraph compiled state machine with confidence-gated routing, Data-Flow X-Ray streaming, and LangSmith tracing."""

import time
import logging
from typing import AsyncGenerator, Dict, Any, Literal, List
from langgraph.graph import StateGraph, END
from backend.agent.state import PatchForgeState
from backend.agent.nodes import (
    run_initial_tests_node,
    triage_with_nano_node,
    ground_with_tavily_node,
    plan_with_ultra_node,
    synthesize_patch_with_super_node,
    verify_patch_in_sandbox_node,
)
from backend.config import settings

logger = logging.getLogger("patchforge.graph")

NODE_LABELS = {
    "run_initial_tests": "Pytest Sandbox & Runtime Tracer",
    "triage_with_nano": "Nemotron 3 Nano Triage (/no_think)",
    "ground_with_tavily": "Tavily Live Web Grounding",
    "plan_with_ultra": "Nemotron 3 Ultra Blast-Radius Planner",
    "synthesize_patch_with_super": "Nemotron 3 Super Patch & Re-Trace",
    "verify_patch_in_sandbox": "Pytest Verification & Flow Restore",
}


def route_after_triage(
    state: PatchForgeState,
) -> Literal["ground_with_tavily", "plan_with_ultra", "synthesize_patch_with_super"]:
    if state.get("needs_web_docs") or state.get("confidence", 1.0) < settings.confidence_threshold_docs:
        return "ground_with_tavily"
    if state.get("confidence", 1.0) < settings.confidence_threshold_ultra:
        return "plan_with_ultra"
    return "synthesize_patch_with_super"


def route_after_grounding(
    state: PatchForgeState,
) -> Literal["plan_with_ultra", "synthesize_patch_with_super"]:
    if state.get("confidence", 1.0) < settings.confidence_threshold_ultra or state.get("retry_count", 0) > 0:
        return "plan_with_ultra"
    return "synthesize_patch_with_super"


def route_after_verification(state: PatchForgeState) -> Literal["plan_with_ultra", "__end__"]:
    status = state.get("status")
    if status in ("HEALED", "FAILED"):
        return "__end__"
    if state.get("retry_count", 0) < settings.max_healing_retries:
        return "plan_with_ultra"
    return "__end__"


def build_patchforge_graph():
    """Construct and compile the LangGraph StateGraph."""
    workflow = StateGraph(PatchForgeState)

    workflow.add_node("run_initial_tests", run_initial_tests_node)
    workflow.add_node("triage_with_nano", triage_with_nano_node)
    workflow.add_node("ground_with_tavily", ground_with_tavily_node)
    workflow.add_node("plan_with_ultra", plan_with_ultra_node)
    workflow.add_node("synthesize_patch_with_super", synthesize_patch_with_super_node)
    workflow.add_node("verify_patch_in_sandbox", verify_patch_in_sandbox_node)

    workflow.set_entry_point("run_initial_tests")
    workflow.add_edge("run_initial_tests", "triage_with_nano")

    workflow.add_conditional_edges(
        "triage_with_nano",
        route_after_triage,
        {
            "ground_with_tavily": "ground_with_tavily",
            "plan_with_ultra": "plan_with_ultra",
            "synthesize_patch_with_super": "synthesize_patch_with_super",
        },
    )

    workflow.add_conditional_edges(
        "ground_with_tavily",
        route_after_grounding,
        {
            "plan_with_ultra": "plan_with_ultra",
            "synthesize_patch_with_super": "synthesize_patch_with_super",
        },
    )

    workflow.add_edge("plan_with_ultra", "synthesize_patch_with_super")
    workflow.add_edge("synthesize_patch_with_super", "verify_patch_in_sandbox")

    workflow.add_conditional_edges(
        "verify_patch_in_sandbox",
        route_after_verification,
        {
            "plan_with_ultra": "plan_with_ultra",
            "__end__": END,
        },
    )

    return workflow.compile()


patchforge_app = build_patchforge_graph()


def _predict_next_node(completed_node: str, state: PatchForgeState) -> str:
    if completed_node == "run_initial_tests":
        return "triage_with_nano"
    if completed_node == "triage_with_nano":
        return route_after_triage(state)
    if completed_node == "ground_with_tavily":
        return route_after_grounding(state)
    if completed_node == "plan_with_ultra":
        return "synthesize_patch_with_super"
    if completed_node == "synthesize_patch_with_super":
        return "verify_patch_in_sandbox"
    if completed_node == "verify_patch_in_sandbox":
        return route_after_verification(state)
    return "__end__"


async def stream_patchforge_execution(
    initial_state: PatchForgeState,
) -> AsyncGenerator[Dict[str, Any], None]:
    """Execute the compiled LangGraph StateGraph via .astream() and yield SSE events including dataflow_trace."""
    workflow_start_time = time.perf_counter()
    current_state: PatchForgeState = dict(initial_state)  # type: ignore
    skipped_nodes: List[str] = []

    yield {
        "event": "workflow_start",
        "data": {
            "target": current_state.get("target", ""),
            "workspace_dir": current_state.get("workspace_dir", ""),
            "status": "INITIALIZING",
            "execution_mode": settings.execution_mode,
        },
    }

    yield {
        "event": "node_start",
        "data": {
            "node": "run_initial_tests",
            "label": NODE_LABELS["run_initial_tests"],
        },
    }

    async for chunk in patchforge_app.astream(current_state, stream_mode="updates"):
        for node_name, state_update in chunk.items():
            if isinstance(state_update, dict):
                current_state.update(state_update)  # type: ignore

            step_timings = current_state.get("step_timings", {})
            node_duration_ms = step_timings.get(node_name, 0.0)

            if node_name == "triage_with_nano":
                nxt = route_after_triage(current_state)
                if nxt != "ground_with_tavily" and "ground_with_tavily" not in skipped_nodes:
                    skipped_nodes.append("ground_with_tavily")
                if nxt == "synthesize_patch_with_super" and "plan_with_ultra" not in skipped_nodes:
                    skipped_nodes.append("plan_with_ultra")
            elif node_name == "ground_with_tavily":
                nxt = route_after_grounding(current_state)
                if nxt == "synthesize_patch_with_super" and "plan_with_ultra" not in skipped_nodes:
                    skipped_nodes.append("plan_with_ultra")

            current_state["skipped_nodes"] = skipped_nodes

            payload: Dict[str, Any] = {
                "node": node_name,
                "duration_ms": node_duration_ms,
                "step_timings": step_timings,
                "skipped_nodes": skipped_nodes,
                "status": current_state.get("status", ""),
                "execution_mode": current_state.get("execution_mode", settings.execution_mode),
            }

            if node_name == "run_initial_tests":
                payload.update(
                    {
                        "test_output": current_state.get("initial_test_output", {}),
                        "error_signature": current_state.get("error_signature", ""),
                        "dataflow_topology": current_state.get("dataflow_topology", {}),
                        "execution_traces": current_state.get("execution_traces", {}),
                    }
                )
                # Emit dedicated dataflow_trace SSE event for the Visual Command Center
                yield {
                    "event": "dataflow_trace",
                    "data": {
                        "phase": "INITIAL_BROKEN",
                        "dataflow_topology": current_state.get("dataflow_topology", {}),
                        "execution_traces": current_state.get("execution_traces", {}),
                    },
                }
            elif node_name == "triage_with_nano":
                payload.update(
                    {
                        "root_cause": current_state.get("root_cause", ""),
                        "library_name": current_state.get("library_name", ""),
                        "deprecated_symbols": current_state.get("deprecated_symbols", []),
                        "confidence": current_state.get("confidence", 0.65),
                        "needs_web_docs": current_state.get("needs_web_docs", True),
                        "telemetry": (
                            current_state["telemetry_steps"][-1]
                            if current_state.get("telemetry_steps")
                            else {}
                        ),
                        "cumulative": {
                            "cost_usd": current_state.get("cumulative_cost_usd", 0.0),
                            "dollars_saved_usd": current_state.get("cumulative_dollars_saved_usd", 0.0),
                            "total_tokens": current_state.get("total_tokens", 0),
                        },
                    }
                )
            elif node_name == "ground_with_tavily":
                payload.update(
                    {
                        "citations": current_state.get("tavily_citations", []),
                        "summary": current_state.get("tavily_summary", ""),
                        "is_live": current_state.get("tavily_is_live", False),
                    }
                )
            elif node_name == "plan_with_ultra":
                payload.update(
                    {
                        "refactoring_plan": current_state.get("refactoring_plan", ""),
                        "telemetry": (
                            current_state["telemetry_steps"][-1]
                            if current_state.get("telemetry_steps")
                            else {}
                        ),
                        "cumulative": {
                            "cost_usd": current_state.get("cumulative_cost_usd", 0.0),
                            "dollars_saved_usd": current_state.get("cumulative_dollars_saved_usd", 0.0),
                            "total_tokens": current_state.get("total_tokens", 0),
                        },
                    }
                )
            elif node_name == "synthesize_patch_with_super":
                payload.update(
                    {
                        "diffs": current_state.get("unified_diffs", {}),
                        "combined_diff": current_state.get("combined_diff", ""),
                        "patch_explanation": current_state.get("patch_explanation", ""),
                        "patched_files": current_state.get("patched_files", {}),
                        "telemetry": (
                            current_state["telemetry_steps"][-1]
                            if current_state.get("telemetry_steps")
                            else {}
                        ),
                        "cumulative": {
                            "cost_usd": current_state.get("cumulative_cost_usd", 0.0),
                            "dollars_saved_usd": current_state.get("cumulative_dollars_saved_usd", 0.0),
                            "total_tokens": current_state.get("total_tokens", 0),
                        },
                    }
                )
            elif node_name == "verify_patch_in_sandbox":
                payload.update(
                    {
                        "test_output": current_state.get("current_test_output", {}),
                        "retry_count": current_state.get("retry_count", 0),
                        "final_success": current_state.get("final_success", False),
                        "message": current_state.get("message", ""),
                        "combined_diff": current_state.get("combined_diff", ""),
                        "patch_explanation": current_state.get("patch_explanation", ""),
                        "dataflow_topology": current_state.get("dataflow_topology", {}),
                        "execution_traces": current_state.get("execution_traces", {}),
                    }
                )
                yield {
                    "event": "dataflow_trace",
                    "data": {
                        "phase": "HEALED_VERIFIED",
                        "dataflow_topology": current_state.get("dataflow_topology", {}),
                        "execution_traces": current_state.get("execution_traces", {}),
                    },
                }

            yield {"event": "node_complete", "data": payload}

            next_node = _predict_next_node(node_name, current_state)
            if next_node != "__end__" and next_node in NODE_LABELS:
                yield {
                    "event": "node_start",
                    "data": {
                        "node": next_node,
                        "label": NODE_LABELS[next_node],
                    },
                }

    total_duration_ms = round((time.perf_counter() - workflow_start_time) * 1000, 1)
    current_state["duration_ms"] = total_duration_ms

    yield {
        "event": "workflow_complete",
        "data": {
            "status": current_state.get("status", "HEALED"),
            "final_success": current_state.get("final_success", False),
            "message": current_state.get("message", ""),
            "combined_diff": current_state.get("combined_diff", ""),
            "patch_explanation": current_state.get("patch_explanation", ""),
            "patched_files": current_state.get("patched_files", {}),
            "dataflow_topology": current_state.get("dataflow_topology", {}),
            "execution_traces": current_state.get("execution_traces", {}),
            "total_cost_usd": current_state.get("cumulative_cost_usd", 0.0),
            "total_dollars_saved": current_state.get("cumulative_dollars_saved_usd", 0.0),
            "total_tokens": current_state.get("total_tokens", 0),
            "duration_ms": total_duration_ms,
            "step_timings": current_state.get("step_timings", {}),
            "skipped_nodes": skipped_nodes,
            "tavily_citations": current_state.get("tavily_citations", []),
            "telemetry_steps": current_state.get("telemetry_steps", []),
            "execution_mode": current_state.get("execution_mode", settings.execution_mode),
        },
    }
