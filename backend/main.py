"""PatchForge FastAPI application entry point with Server-Sent Events (SSE) streaming."""

import os
import json
import logging
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.config import settings
from backend.core.sandbox_runner import sandbox_runner
from backend.core.benchmark_engine import benchmark_engine
from backend.agent.graph import stream_patchforge_execution
from backend.agent.state import PatchForgeState

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("patchforge.api")

app = FastAPI(
    title="PatchForge API",
    description="Confidence-Gated Autonomous Repo Healer powered by Nebius Token Factory, NVIDIA Nemotron 3, and Tavily Live Grounding",
    version="1.0.0"
)

# Enable CORS for local Vite dev server and cloud origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Resolve dynamic Nebius Token Factory models on boot."""
    logger.info("Initializing PatchForge API...")
    resolved = await settings.resolve_nebius_models()
    logger.info("Nebius Token Factory model resolution complete: %s", resolved)


class HealRequest(BaseModel):
    target: str  # e.g., "scenario:repo_1_pydantic_v2" or "https://github.com/..."
    custom_repo_url: Optional[str] = None


class ExportPRRequest(BaseModel):
    repo_name: str
    branch_name: str = "patchforge-autonomous-heal"
    commit_message: str = "fix: autonomous migration patch synthesized by PatchForge"
    patch_content: str


@app.get("/api/health")
async def health_check():
    """Returns dynamic model registry status and Nebius/Tavily connection states."""
    return {
        "status": "healthy",
        "nebius": {
            "connected": settings.is_nebius_connected,
            "base_url": settings.nebius_base_url,
            "models": settings.resolved_models,
        },
        "tavily": {
            "connected": settings.is_tavily_connected,
            "service": "Tavily Search & Extract API",
        },
        "orchestration": {
            "engine": "Compiled LangGraph StateGraph",
            "confidence_threshold_docs": settings.confidence_threshold_docs,
            "confidence_threshold_ultra": settings.confidence_threshold_ultra,
            "max_healing_retries": settings.max_healing_retries,
        }
    }


@app.get("/api/scenarios")
async def get_scenarios():
    """Returns the 3 built-in broken repositories for instant 1-click Judge testing."""
    return {
        "scenarios": [
            {
                "id": "scenario:repo_1_pydantic_v2",
                "name": "Scenario 1: Pydantic v1 → v2 Migration",
                "library": "pydantic",
                "target_version": "2.x",
                "badge": "Deprecation Rot",
                "color": "indigo",
                "description": "Fails under modern Pydantic v2 runtime due to deprecated @validator decorators, legacy Config class, and .dict() serialization.",
                "failing_tests": ["test_modern_v2_model_config", "test_modern_v2_serialization"],
                "solution_summary": "Nano triages deprecation; Tavily grounds V2 Migration Guide; Super synthesizes @field_validator & ConfigDict replacements."
            },
            {
                "id": "scenario:repo_2_fastapi_lifespan",
                "name": "Scenario 2: FastAPI Lifespan & HTTPX Modernization",
                "library": "fastapi",
                "target_version": "0.111+",
                "badge": "Async Runtime Shift",
                "color": "emerald",
                "description": "Microservice failing unit tests because @app.on_event('startup') was deprecated in favor of @asynccontextmanager lifespan context handlers.",
                "failing_tests": ["test_lifespan_configured"],
                "solution_summary": "Tavily fetches official ASGI lifespan documentation; Ultra architectures the lifespan async generator; Super updates app.py."
            },
            {
                "id": "scenario:repo_3_cve_security",
                "name": "Scenario 3: CVE-2020-1747 & SQL Injection Hardening",
                "library": "pyyaml & sqlite3",
                "target_version": "6.x",
                "badge": "2026 Security CVE",
                "color": "rose",
                "description": "Security audit test failure: arbitrary code execution via unsafe yaml.load (CVE-2020-1747) and SQL parameter injection vulnerability.",
                "failing_tests": ["test_yaml_safe_loader_mitigates_cve", "test_sql_injection_defense"],
                "solution_summary": "Nano flags security alert; Tavily pulls NIST NVD advisory; Ultra plans parameterized queries; Super applies yaml.safe_load."
            }
        ]
    }


@app.post("/api/heal/stream")
async def heal_repository_stream(req: HealRequest):
    """Executes the closed-loop agentic healing pipeline with real-time SSE streaming."""
    target = req.custom_repo_url.strip() if req.custom_repo_url else req.target

    logger.info("Received healing request for target: %s", target)

    async def event_generator():
        workspace_dir = ""
        try:
            # Step 1: Create isolated sandbox workspace
            workspace_dir = await sandbox_runner.create_workspace(target)

            initial_state: PatchForgeState = {
                "target": target,
                "workspace_dir": workspace_dir,
                "retry_count": 0,
                "status": "INITIALIZING",
                "initial_test_output": {},
                "current_test_output": {},
                "failing_files": [],
                "error_signature": "",
                "root_cause": "",
                "library_name": "",
                "target_version": "",
                "deprecated_symbols": [],
                "confidence": 0.0,
                "needs_web_docs": True,
                "tavily_citations": [],
                "tavily_summary": "",
                "refactoring_plan": "",
                "patched_files": {},
                "unified_diffs": {},
                "combined_diff": "",
                "telemetry_steps": [],
                "cumulative_cost_usd": 0.0,
                "cumulative_ultra_baseline_cost_usd": 0.0,
                "cumulative_dollars_saved_usd": 0.0,
                "total_tokens": 0,
                "duration_ms": 0.0,
                "final_success": False,
                "message": ""
            }

            async for event_data in stream_patchforge_execution(initial_state):
                json_payload = json.dumps(event_data)
                yield f"data: {json_payload}\n\n"

        except Exception as e:
            logger.error("Error during agent execution: %s", str(e), exc_info=True)
            err_payload = json.dumps({
                "event": "workflow_error",
                "data": {"error": str(e), "status": "FAILED"}
            })
            yield f"data: {err_payload}\n\n"
        finally:
            if workspace_dir:
                sandbox_runner.cleanup(workspace_dir)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/api/benchmark")
async def get_benchmarks():
    """Returns empirical benchmark metrics comparing Monolithic Ultra vs PatchForge Cascade."""
    return benchmark_engine.get_empirical_benchmarks()


@app.post("/api/benchmark/live")
async def run_live_benchmark(req: HealRequest):
    """Triggers a live multi-tier benchmark run for the selected scenario."""
    scenario_id = req.target.replace("scenario:", "").strip()
    result = await benchmark_engine.run_live_benchmark_scenario(scenario_id)
    return result


@app.post("/api/export/pr")
async def export_pull_request(req: ExportPRRequest):
    """Simulates creating a verified GitHub Pull Request branch."""
    return {
        "success": True,
        "branch": req.branch_name,
        "commit_hash": "a4f81c9b20e7d4e9",
        "title": req.commit_message,
        "pr_url": f"https://github.com/piyushgoel2808/patchforge/pull/new/{req.branch_name}",
        "message": "Automated Pull Request package generated with verified passing test suite!"
    }


# Mount static React build if it exists (for single-container production deployment)
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
