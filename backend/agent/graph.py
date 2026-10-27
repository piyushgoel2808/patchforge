"""LangGraph compiled state machine with confidence-gated routing and self-healing loop."""

import logging
from typing import AsyncGenerator, Dict, Any, Literal
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


# Conditional Edge: Determine whether Tavily live web grounding is needed
def route_after_triage(state: PatchForgeState) -> Literal["ground_with_tavily", "plan_with_ultra", "synthesize_patch_with_super"]:
    if state.get("needs_web_docs") or state.get("confidence", 1.0) < settings.confidence_threshold_docs:
        return "ground_with_tavily"
    if state.get("confidence", 1.0) < settings.confidence_threshold_ultra:
        return "plan_with_ultra"
    return "synthesize_patch_with_super"


# Conditional Edge: Route after Tavily grounding (Ultra reasoning vs direct Super patch)
def route_after_grounding(state: PatchForgeState) -> Literal["plan_with_ultra", "synthesize_patch_with_super"]:
    if state.get("confidence", 1.0) < settings.confidence_threshold_ultra or state.get("retry_count", 0) > 0:
        return "plan_with_ultra"
    return "synthesize_patch_with_super"


# Conditional Edge: Evaluate verification outcome
def route_after_verification(state: PatchForgeState) -> Literal["plan_with_ultra", "__end__"]:
    status = state.get("status")
    if status == "HEALED" or status == "FAILED":
        return "__end__"
    # Retry loop: feed new error back to Ultra reasoning
    if state.get("retry_count", 0) < settings.max_healing_retries:
        return "plan_with_ultra"
    return "__end__"


def build_patchforge_graph() -> StateGraph:
    """Construct and compile the LangGraph state machine."""
    workflow = StateGraph(PatchForgeState)

    # Register nodes
    workflow.add_node("run_initial_tests", run_initial_tests_node)
    workflow.add_node("triage_with_nano", triage_with_nano_node)
    workflow.add_node("ground_with_tavily", ground_with_tavily_node)
    workflow.add_node("plan_with_ultra", plan_with_ultra_node)
    workflow.add_node("synthesize_patch_with_super", synthesize_patch_with_super_node)
    workflow.add_node("verify_patch_in_sandbox", verify_patch_in_sandbox_node)

    # Entry point
    workflow.set_entry_point("run_initial_tests")

    # Edges
    workflow.add_edge("run_initial_tests", "triage_with_nano")

    workflow.add_conditional_edges(
        "triage_with_nano",
        route_after_triage,
        {
            "ground_with_tavily": "ground_with_tavily",
            "plan_with_ultra": "plan_with_ultra",
            "synthesize_patch_with_super": "synthesize_patch_with_super",
        }
    )

    workflow.add_conditional_edges(
        "ground_with_tavily",
        route_after_grounding,
        {
            "plan_with_ultra": "plan_with_ultra",
            "synthesize_patch_with_super": "synthesize_patch_with_super",
        }
    )

    workflow.add_edge("plan_with_ultra", "synthesize_patch_with_super")
    workflow.add_edge("synthesize_patch_with_super", "verify_patch_in_sandbox")

    workflow.add_conditional_edges(
        "verify_patch_in_sandbox",
        route_after_verification,
        {
            "plan_with_ultra": "plan_with_ultra",
            "__end__": END,
        }
    )

    return workflow.compile()


patchforge_app = build_patchforge_graph()


async def stream_patchforge_execution(initial_state: PatchForgeState) -> AsyncGenerator[Dict[str, Any], None]:
    """Execute the compiled graph step-by-step and yield streaming SSE events."""
    current_state = initial_state

    # Emit initialization event
    yield {
        "event": "workflow_start",
        "data": {
            "target": current_state["target"],
            "workspace_dir": current_state["workspace_dir"],
            "status": "INITIALIZING"
        }
    }

    # Node 1: Initial Tests
    yield {"event": "node_start", "data": {"node": "run_initial_tests", "label": "Pytest Baseline Sandbox"}}
    current_state = await run_initial_tests_node(current_state)
    yield {
        "event": "node_complete",
        "data": {
            "node": "run_initial_tests",
            "test_output": current_state["initial_test_output"],
            "error_signature": current_state["error_signature"],
            "status": current_state["status"]
        }
    }

    # Node 2: Nano Triage
    yield {"event": "node_start", "data": {"node": "triage_with_nano", "label": "Nemotron 3 Nano Triage (/no_think)"}}
    current_state = await triage_with_nano_node(current_state)
    yield {
        "event": "node_complete",
        "data": {
            "node": "triage_with_nano",
            "root_cause": current_state["root_cause"],
            "library_name": current_state["library_name"],
            "deprecated_symbols": current_state["deprecated_symbols"],
            "confidence": current_state["confidence"],
            "needs_web_docs": current_state["needs_web_docs"],
            "telemetry": current_state["telemetry_steps"][-1] if current_state.get("telemetry_steps") else {},
            "cumulative": {
                "cost_usd": current_state["cumulative_cost_usd"],
                "dollars_saved_usd": current_state["cumulative_dollars_saved_usd"],
                "total_tokens": current_state["total_tokens"]
            }
        }
    }

    # Node 3: Ground with Tavily (if triggered by confidence gate or symbols)
    next_step = route_after_triage(current_state)
    if next_step == "ground_with_tavily":
        yield {"event": "node_start", "data": {"node": "ground_with_tavily", "label": "Tavily Live Web Grounding"}}
        current_state = await ground_with_tavily_node(current_state)
        yield {
            "event": "node_complete",
            "data": {
                "node": "ground_with_tavily",
                "citations": current_state.get("tavily_citations", []),
                "summary": current_state.get("tavily_summary", "")
            }
        }
        next_step = route_after_grounding(current_state)

    # Healing Loop (up to 3 retries)
    while True:
        # Node 4: Ultra Planner (if low confidence or retry)
        if next_step == "plan_with_ultra":
            yield {"event": "node_start", "data": {"node": "plan_with_ultra", "label": "Nemotron 3 Ultra 550B Architectural Planner"}}
            current_state = await plan_with_ultra_node(current_state)
            yield {
                "event": "node_complete",
                "data": {
                    "node": "plan_with_ultra",
                    "refactoring_plan": current_state.get("refactoring_plan", ""),
                    "telemetry": current_state["telemetry_steps"][-1] if current_state.get("telemetry_steps") else {},
                    "cumulative": {
                        "cost_usd": current_state["cumulative_cost_usd"],
                        "dollars_saved_usd": current_state["cumulative_dollars_saved_usd"],
                        "total_tokens": current_state["total_tokens"]
                    }
                }
            }

        # Node 5: Super Code Synthesizer
        yield {"event": "node_start", "data": {"node": "synthesize_patch_with_super", "label": "Nemotron 3 Super 120B Unified Patch Synthesis"}}
        current_state = await synthesize_patch_with_super_node(current_state)
        yield {
            "event": "node_complete",
            "data": {
                "node": "synthesize_patch_with_super",
                "diffs": current_state.get("unified_diffs", {}),
                "combined_diff": current_state.get("combined_diff", ""),
                "telemetry": current_state["telemetry_steps"][-1] if current_state.get("telemetry_steps") else {},
                "cumulative": {
                    "cost_usd": current_state["cumulative_cost_usd"],
                    "dollars_saved_usd": current_state["cumulative_dollars_saved_usd"],
                    "total_tokens": current_state["total_tokens"]
                }
            }
        }

        # Node 6: Verify in Sandbox
        yield {"event": "node_start", "data": {"node": "verify_patch_in_sandbox", "label": "Pytest Verification Sandbox"}}
        current_state = await verify_patch_in_sandbox_node(current_state)
        yield {
            "event": "node_complete",
            "data": {
                "node": "verify_patch_in_sandbox",
                "test_output": current_state["current_test_output"],
                "retry_count": current_state["retry_count"],
                "status": current_state["status"],
                "final_success": current_state.get("final_success", False),
                "message": current_state.get("message", "")
            }
        }

        decision = route_after_verification(current_state)
        if decision == "__end__":
            break
        else:
            next_step = "plan_with_ultra"

    # Final Completion Event
    yield {
        "event": "workflow_complete",
        "data": {
            "status": current_state["status"],
            "final_success": current_state.get("final_success", False),
            "message": current_state.get("message", ""),
            "combined_diff": current_state.get("combined_diff", ""),
            "total_cost_usd": current_state["cumulative_cost_usd"],
            "total_dollars_saved": current_state["cumulative_dollars_saved_usd"],
            "total_tokens": current_state["total_tokens"],
            "tavily_citations": current_state.get("tavily_citations", []),
            "telemetry_steps": current_state.get("telemetry_steps", [])
        }
    }
