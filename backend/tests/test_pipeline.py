"""End-to-end integration and unit tests for PatchForge v2.0 (Data-Flow X-Ray, Runtime Tracer, Chaos Injector & 4-Scenario LangGraph Pipeline)."""

import pytest
from backend.config import settings
from backend.core.nebius_client import nebius_client
from backend.core.tavily_grounding import tavily_service
from backend.core.sandbox_runner import sandbox_runner
from backend.core.benchmark_engine import benchmark_engine
from backend.core.dataflow_mapper import dataflow_mapper
from backend.core.runtime_tracer import runtime_tracer
from backend.agent.graph import patchforge_app, stream_patchforge_execution
from backend.agent.state import PatchForgeState


@pytest.mark.asyncio
async def test_model_registry_resolution():
    models = await settings.resolve_nebius_models()
    assert "nano" in models
    assert "super" in models
    assert "ultra" in models


@pytest.mark.asyncio
async def test_universal_dataflow_mapper_and_chaos_injector():
    """Verify Engine 1 (UniversalDataFlowMapper) and Engine 2 (RuntimePayloadTracer + Chaos Injector)."""
    topo = dataflow_mapper.build_topology("scenario:repo_1_pydantic_v2", is_healed=False)
    nodes = topo["topology"]["nodes"]
    edges = topo["topology"]["edges"]
    assert len(nodes) == 4
    assert len(edges) == 3
    assert any(n["status"] == "CRASHED" for n in nodes)
    assert any(n["status"] == "STARVED" for n in nodes)

    # Verify Chaos Fault Injection shifts crash origin and recalculates blast radius
    chaos = runtime_tracer.inject_chaos_fault(
        target="scenario:repo_1_pydantic_v2",
        node_id="order_pipeline.py::calculate_invoice",
        fault_type="malformed_contract",
    )
    chaos_nodes = {n["id"]: n for n in chaos["topology"]["nodes"]}
    assert chaos_nodes["order_pipeline.py::calculate_invoice"]["status"] == "CRASHED"
    assert chaos_nodes["order_pipeline.py::commit_ledger"]["status"] == "STARVED"
    assert chaos_nodes["models.py::UserModel"]["status"] == "PASSED"


@pytest.mark.asyncio
async def test_langgraph_healing_scenario_1_ecommerce_pydantic():
    workspace = await sandbox_runner.create_workspace("scenario:repo_1_pydantic_v2")
    try:
        baseline = await sandbox_runner.run_tests(workspace)
        assert not baseline.success

        final_state = await patchforge_app.ainvoke(
            {"target": "scenario:repo_1_pydantic_v2", "workspace_dir": workspace, "retry_count": 0}
        )
        assert final_state["status"] == "HEALED"
        assert final_state["final_success"] is True
        assert final_state["current_test_output"]["success"] is True
        assert "dataflow_topology" in final_state
        assert len(final_state["execution_traces"]["healed_verified_trace"]) == 4
    finally:
        sandbox_runner.cleanup(workspace)


@pytest.mark.asyncio
async def test_langgraph_healing_scenario_2_saas_fastapi():
    workspace = await sandbox_runner.create_workspace("scenario:repo_2_fastapi_lifespan")
    try:
        baseline = await sandbox_runner.run_tests(workspace)
        assert not baseline.success

        final_state = await patchforge_app.ainvoke(
            {"target": "scenario:repo_2_fastapi_lifespan", "workspace_dir": workspace, "retry_count": 0}
        )
        assert final_state["status"] == "HEALED"
        assert final_state["final_success"] is True
        assert final_state["current_test_output"]["success"] is True
    finally:
        sandbox_runner.cleanup(workspace)


@pytest.mark.asyncio
async def test_langgraph_healing_scenario_3_enterprise_security():
    workspace = await sandbox_runner.create_workspace("scenario:repo_3_cve_security")
    try:
        baseline = await sandbox_runner.run_tests(workspace)
        assert not baseline.success

        final_state = await patchforge_app.ainvoke(
            {"target": "scenario:repo_3_cve_security", "workspace_dir": workspace, "retry_count": 0}
        )
        assert final_state["status"] == "HEALED"
        assert final_state["final_success"] is True
        assert final_state["current_test_output"]["success"] is True
    finally:
        sandbox_runner.cleanup(workspace)


@pytest.mark.asyncio
async def test_langgraph_healing_scenario_4_document_pipeline():
    workspace = await sandbox_runner.create_workspace("scenario:repo_4_document_pipeline")
    try:
        baseline = await sandbox_runner.run_tests(workspace)
        assert not baseline.success

        final_state = await patchforge_app.ainvoke(
            {"target": "scenario:repo_4_document_pipeline", "workspace_dir": workspace, "retry_count": 0}
        )
        assert final_state["status"] == "HEALED"
        assert final_state["final_success"] is True
        assert final_state["current_test_output"]["success"] is True
        assert "vector_retriever.py" in final_state["unified_diffs"]
    finally:
        sandbox_runner.cleanup(workspace)


@pytest.mark.asyncio
async def test_sse_streaming_with_dataflow_trace_events():
    workspace = await sandbox_runner.create_workspace("scenario:repo_4_document_pipeline")
    try:
        initial_state: PatchForgeState = {
            "target": "scenario:repo_4_document_pipeline",
            "workspace_dir": workspace,
            "retry_count": 0,
            "status": "INITIALIZING",
        }
        events = []
        async for evt in stream_patchforge_execution(initial_state):
            events.append(evt)

        event_types = [e["event"] for e in events]
        assert "dataflow_trace" in event_types
        assert "workflow_complete" in event_types
        assert events[-1]["data"]["final_success"] is True
    finally:
        sandbox_runner.cleanup(workspace)


@pytest.mark.asyncio
async def test_custom_repository_dynamic_ast_and_tracer(tmp_path):
    """Verify that dynamic AST parsing and execution trace generation work seamlessly on custom repos."""
    # Create arbitrary python files in a temporary folder
    service_file = tmp_path / "custom_service.py"
    service_file.write_text(
        "def process_order(order_data: dict):\n    return order_data\n\n"
        "def validate_order(order_data: dict):\n    return True\n"
    )
    worker_file = tmp_path / "custom_worker.py"
    worker_file.write_text(
        "def dispatch_task(task_id: str):\n    pass\n"
    )

    ws_dir = str(tmp_path)
    custom_target = "https://github.com/acme/enterprise-service"

    topo = dataflow_mapper.build_topology(target=custom_target, workspace_dir=ws_dir, is_healed=False)
    nodes = topo["topology"]["nodes"]
    assert len(nodes) >= 2
    node_ids = [n["id"] for n in nodes]
    assert any("custom_service.py::process_order" in nid for nid in node_ids)

    traces = runtime_tracer.build_execution_traces(target=custom_target, workspace_dir=ws_dir)
    broken_trace = traces["initial_broken_trace"]
    healed_trace = traces["healed_verified_trace"]

    assert len(broken_trace) == len(nodes)
    assert len(healed_trace) == len(nodes)
    assert broken_trace[0]["node_id"] == nodes[0]["id"]
    assert healed_trace[0]["node_id"] == nodes[0]["id"]
    assert broken_trace[1]["status"] == "CRASHED"
    assert healed_trace[1]["status"] == "HEALED_PASS"


@pytest.mark.asyncio
async def test_sbfl_spa_sarif_and_agentless_intelligence():
    """Verify AutoCodeRover Ochiai SBFL, Aider PageRank, VulnResolver SPAAgent, Agentless Repro Test, SARIF v2.1.0, and AGENTS.md."""
    topo_broken = dataflow_mapper.build_topology("scenario:repo_1_pydantic_v2", is_healed=False)
    intel_broken = topo_broken["intelligence"]
    crashed_node = next(n for n in topo_broken["topology"]["nodes"] if n["status"] == "CRASHED")
    assert crashed_node["sbfl_ochiai"] == 0.96
    assert crashed_node["pagerank_score"] > 0.5
    assert "PASSED" in intel_broken["scorecard"]["ast_syntax_gate"]
    assert len(intel_broken["safety_invariants"]) == 3
    assert any(not inv["passed"] for inv in intel_broken["safety_invariants"])
    assert "test_patchforge_repro" in intel_broken["repro_test_filename"]
    assert "def test_patchforge_repro" in intel_broken["repro_test_code"]
    assert intel_broken["sarif_report"]["version"] == "2.1.0"
    assert "AGENTS.md" in intel_broken["agents_md_rule"]

    topo_healed = dataflow_mapper.build_topology("scenario:repo_1_pydantic_v2", is_healed=True)
    intel_healed = topo_healed["intelligence"]
    healed_node = next(n for n in topo_healed["topology"]["nodes"] if n["status"] == "HEALED")
    assert healed_node["sbfl_ochiai"] == 0.04
    assert all(inv["passed"] for inv in intel_healed["safety_invariants"])
    assert intel_healed["scorecard"]["overall_moatless_reward"] >= 0.95


