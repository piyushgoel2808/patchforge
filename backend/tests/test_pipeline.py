"""End-to-end integration and unit tests for the PatchForge compiled LangGraph pipeline."""

import pytest
from backend.config import settings
from backend.core.nebius_client import nebius_client
from backend.core.tavily_grounding import tavily_service
from backend.core.sandbox_runner import sandbox_runner
from backend.core.benchmark_engine import benchmark_engine
from backend.agent.graph import patchforge_app, stream_patchforge_execution
from backend.agent.state import PatchForgeState


@pytest.mark.asyncio
async def test_model_registry_resolution():
    """Verify that Nebius model tiers are dynamically mapped or have verified fallbacks."""
    models = await settings.resolve_nebius_models()
    assert "nano" in models
    assert "super" in models
    assert "ultra" in models
    assert "nemotron" in models["nano"].lower() or "nvidia" in models["nano"].lower()


@pytest.mark.asyncio
async def test_tavily_grounding_citations_and_latency():
    """Verify that Tavily service yields structured citations with URLs, scores, and latency."""
    res = await tavily_service.fetch_migration_and_cve_docs(
        error_signature="PydanticDeprecatedSince20: The parse_obj method is deprecated",
        library_name="pydantic",
        target_version="2.0",
        symbols=["@validator", ".dict()", ".parse_obj()"],
    )
    assert res.citations is not None
    assert len(res.citations) > 0
    assert "http" in res.citations[0]["url"]
    assert res.citations[0]["score"] >= 0.5
    assert res.latency_ms > 0.0


@pytest.mark.asyncio
async def test_langgraph_end_to_end_healing_scenario_1_pydantic():
    """Verify compiled LangGraph patchforge_app autonomously heals Scenario 1 (Pydantic v1 -> v2)."""
    workspace = await sandbox_runner.create_workspace("scenario:repo_1_pydantic_v2")
    try:
        # Baseline must fail on legacy Config class and .parse_obj() deprecation warning
        baseline = await sandbox_runner.run_tests(workspace)
        assert not baseline.success
        assert len(baseline.failed_tests) >= 2

        # Run full compiled LangGraph state machine
        initial_state: PatchForgeState = {
            "target": "scenario:repo_1_pydantic_v2",
            "workspace_dir": workspace,
            "retry_count": 0,
            "status": "INITIALIZING",
            "telemetry_steps": [],
            "step_timings": {},
            "skipped_nodes": [],
            "cumulative_cost_usd": 0.0,
            "cumulative_ultra_baseline_cost_usd": 0.0,
            "cumulative_dollars_saved_usd": 0.0,
            "total_tokens": 0,
            "final_success": False,
        }
        final_state = await patchforge_app.ainvoke(initial_state)

        assert final_state["status"] == "HEALED"
        assert final_state["final_success"] is True
        assert final_state["current_test_output"]["success"] is True
        assert "models.py" in final_state["unified_diffs"]
        assert len(final_state["tavily_citations"]) > 0
        assert final_state["cumulative_dollars_saved_usd"] > 0
    finally:
        sandbox_runner.cleanup(workspace)


@pytest.mark.asyncio
async def test_langgraph_end_to_end_healing_scenario_2_fastapi():
    """Verify compiled LangGraph patchforge_app autonomously heals Scenario 2 (FastAPI lifespan + ASGITransport)."""
    workspace = await sandbox_runner.create_workspace("scenario:repo_2_fastapi_lifespan")
    try:
        baseline = await sandbox_runner.run_tests(workspace)
        assert not baseline.success
        assert len(baseline.failed_tests) >= 2

        initial_state: PatchForgeState = {
            "target": "scenario:repo_2_fastapi_lifespan",
            "workspace_dir": workspace,
            "retry_count": 0,
            "status": "INITIALIZING",
            "telemetry_steps": [],
            "step_timings": {},
            "skipped_nodes": [],
            "cumulative_cost_usd": 0.0,
            "cumulative_ultra_baseline_cost_usd": 0.0,
            "cumulative_dollars_saved_usd": 0.0,
            "total_tokens": 0,
            "final_success": False,
        }
        final_state = await patchforge_app.ainvoke(initial_state)

        assert final_state["status"] == "HEALED"
        assert final_state["final_success"] is True
        assert final_state["current_test_output"]["success"] is True
        assert "app.py" in final_state["unified_diffs"]
    finally:
        sandbox_runner.cleanup(workspace)


@pytest.mark.asyncio
async def test_langgraph_end_to_end_healing_scenario_3_security():
    """Verify compiled LangGraph patchforge_app autonomously heals Scenario 3 (CVE-2020-1747 & SQLi)."""
    workspace = await sandbox_runner.create_workspace("scenario:repo_3_cve_security")
    try:
        baseline = await sandbox_runner.run_tests(workspace)
        assert not baseline.success
        assert len(baseline.failed_tests) >= 2

        initial_state: PatchForgeState = {
            "target": "scenario:repo_3_cve_security",
            "workspace_dir": workspace,
            "retry_count": 0,
            "status": "INITIALIZING",
            "telemetry_steps": [],
            "step_timings": {},
            "skipped_nodes": [],
            "cumulative_cost_usd": 0.0,
            "cumulative_ultra_baseline_cost_usd": 0.0,
            "cumulative_dollars_saved_usd": 0.0,
            "total_tokens": 0,
            "final_success": False,
        }
        final_state = await patchforge_app.ainvoke(initial_state)

        assert final_state["status"] == "HEALED"
        assert final_state["final_success"] is True
        assert final_state["current_test_output"]["success"] is True
        assert "secure_service.py" in final_state["unified_diffs"]
    finally:
        sandbox_runner.cleanup(workspace)


@pytest.mark.asyncio
async def test_sse_streaming_generator():
    """Verify stream_patchforge_execution yields complete SSE node lifecycle events via .astream()."""
    workspace = await sandbox_runner.create_workspace("scenario:repo_1_pydantic_v2")
    try:
        initial_state: PatchForgeState = {
            "target": "scenario:repo_1_pydantic_v2",
            "workspace_dir": workspace,
            "retry_count": 0,
            "status": "INITIALIZING",
            "telemetry_steps": [],
            "step_timings": {},
            "skipped_nodes": [],
            "cumulative_cost_usd": 0.0,
            "cumulative_ultra_baseline_cost_usd": 0.0,
            "cumulative_dollars_saved_usd": 0.0,
            "total_tokens": 0,
            "final_success": False,
        }
        events = []
        async for evt in stream_patchforge_execution(initial_state):
            events.append(evt)

        event_types = [e["event"] for e in events]
        assert "workflow_start" in event_types
        assert "node_start" in event_types
        assert "node_complete" in event_types
        assert "workflow_complete" in event_types

        final_evt = events[-1]["data"]
        assert final_evt["final_success"] is True
        assert final_evt["status"] == "HEALED"
        assert "run_initial_tests" in final_evt["step_timings"]
        assert "triage_with_nano" in final_evt["step_timings"]
    finally:
        sandbox_runner.cleanup(workspace)


@pytest.mark.asyncio
async def test_telemetry_and_live_benchmark_engine():
    """Verify Nebius client telemetry savings and live benchmark scenario measurement."""
    result = await nebius_client.generate(
        tier="nano",
        messages=[{"role": "user", "content": "Triage this Pydantic error"}],
        scenario_hint="repo_1_pydantic_v2",
    )
    telem = result.to_dict()
    assert telem["tier"] == "nano"
    assert telem["cost_usd"] < telem["monolithic_ultra_cost_usd"]
    assert telem["dollars_saved_usd"] > 0
    assert telem["savings_percent"] > 50.0

    bench_res = await benchmark_engine.run_live_benchmark_scenario("repo_1_pydantic_v2")
    assert bench_res["passed"] is True
    assert bench_res["measured_savings_pct"] > 50.0
    assert bench_res["total_benchmark_time_ms"] > 10.0
