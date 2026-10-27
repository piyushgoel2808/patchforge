"""End-to-end integration and unit tests for PatchForge pipeline."""

import pytest
import asyncio
from backend.config import settings
from backend.core.nebius_client import nebius_client
from backend.core.tavily_grounding import tavily_service
from backend.core.sandbox_runner import sandbox_runner
from backend.core.benchmark_engine import benchmark_engine


@pytest.mark.asyncio
async def test_model_registry_resolution():
    """Verify that Nebius model tiers are dynamically mapped or have verified fallbacks."""
    models = await settings.resolve_nebius_models()
    assert "nano" in models
    assert "super" in models
    assert "ultra" in models
    assert "nemotron" in models["nano"].lower() or "nvidia" in models["nano"].lower()


@pytest.mark.asyncio
async def test_tavily_grounding_citations():
    """Verify that Tavily service yields structured citations with URLs and scores."""
    res = await tavily_service.fetch_migration_and_cve_docs(
        error_signature="cannot import name 'validator'",
        library_name="pydantic",
        target_version="2.0",
        symbols=["@validator", ".dict()"]
    )
    assert res.citations is not None
    assert len(res.citations) > 0
    assert "http" in res.citations[0]["url"]
    assert res.citations[0]["score"] >= 0.5


@pytest.mark.asyncio
async def test_sandbox_baseline_and_healing_scenario_1():
    """Verify Scenario 1 (Pydantic v2): fails baseline, then passes when patched."""
    # 1. Create workspace
    workspace = await sandbox_runner.create_workspace("scenario:repo_1_pydantic_v2")

    # 2. Baseline pytest must fail (due to legacy Config class)
    baseline = await sandbox_runner.run_tests(workspace)
    assert not baseline.success
    assert baseline.returncode != 0
    assert "test_modern_v2_model_config" in baseline.failed_tests or "FAILED" in baseline.stdout

    # 3. Apply modern Pydantic v2 patch
    modern_model_code = '''"""User data models modernized for Pydantic v2."""
from pydantic import BaseModel, field_validator, ConfigDict


class UserModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    name: str
    email: str

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid email format: missing @ symbol")
        return v.lower()

    def serialize_user(self) -> dict:
        return self.model_dump()
'''
    success, diffs, combined_diff = sandbox_runner.apply_patch(
        workspace,
        {"models.py": modern_model_code}
    )
    assert success
    assert "models.py" in diffs

    # 4. Re-run tests -> must pass 100%
    verified = await sandbox_runner.run_tests(workspace)
    assert verified.success
    assert verified.returncode == 0
    assert len(verified.failed_tests) == 0

    # Cleanup
    sandbox_runner.cleanup(workspace)


@pytest.mark.asyncio
async def test_sandbox_baseline_and_healing_scenario_2_fastapi():
    """Verify Scenario 2 (FastAPI lifespan): fails baseline, then passes when patched."""
    workspace = await sandbox_runner.create_workspace("scenario:repo_2_fastapi_lifespan")

    # Baseline pytest must fail (due to deprecated @app.on_event)
    baseline = await sandbox_runner.run_tests(workspace)
    assert not baseline.success

    # Apply modern FastAPI lifespan patch
    modern_app_code = '''"""FastAPI application modernized with lifespan context manager."""
from contextlib import asynccontextmanager
from fastapi import FastAPI

db_state = {"connected": False}


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_state["connected"] = True
    yield
    db_state["connected"] = False


app = FastAPI(title="Modernized Lifespan Microservice", lifespan=lifespan)


@app.get("/health")
def health_check():
    return {"status": "ok", "db_connected": db_state["connected"]}
'''
    success, diffs, combined_diff = sandbox_runner.apply_patch(
        workspace,
        {"app.py": modern_app_code}
    )
    assert success

    # Re-run tests -> must pass 100%
    verified = await sandbox_runner.run_tests(workspace)
    assert verified.success
    assert verified.returncode == 0
    assert len(verified.failed_tests) == 0

    sandbox_runner.cleanup(workspace)


@pytest.mark.asyncio
async def test_sandbox_baseline_and_healing_scenario_3_security():
    """Verify Scenario 3 (CVE-2020-1747 & SQLi): fails baseline, then passes when patched."""
    workspace = await sandbox_runner.create_workspace("scenario:repo_3_cve_security")

    # Baseline fails
    baseline = await sandbox_runner.run_tests(workspace)
    assert not baseline.success

    # Apply secure code
    secure_code = '''"""Security service with CVE-2020-1747 and SQL injection remediations applied."""
import yaml
import sqlite3
from typing import Any, Dict


def load_config_safely(yaml_string: str) -> Dict[str, Any]:
    return yaml.safe_load(yaml_string)


def query_user_account(db_conn: sqlite3.Connection, username: str) -> list:
    cursor = db_conn.cursor()
    cursor.execute("SELECT id, username, role FROM users WHERE username = ?", (username,))
    return cursor.fetchall()
'''
    success, diffs, combined_diff = sandbox_runner.apply_patch(
        workspace,
        {"secure_service.py": secure_code}
    )
    assert success

    verified = await sandbox_runner.run_tests(workspace)
    assert verified.success
    assert verified.returncode == 0

    sandbox_runner.cleanup(workspace)


@pytest.mark.asyncio
async def test_telemetry_cost_and_savings_calculation():
    """Verify that Nebius client calculates cost savings vs monolithic Ultra."""
    result = await nebius_client.generate(
        tier="nano",
        messages=[{"role": "user", "content": "Triage this error"}]
    )
    telem = result.to_dict()
    assert telem["tier"] == "nano"
    assert telem["cost_usd"] < telem["monolithic_ultra_cost_usd"]
    assert telem["dollars_saved_usd"] > 0
    assert telem["savings_percent"] > 50.0


def test_benchmark_empirical_metrics():
    """Verify that benchmark engine returns complete comparative matrix."""
    data = benchmark_engine.get_empirical_benchmarks()
    assert "scenarios" in data
    assert len(data["scenarios"]) == 3
    assert "aggregate_comparison" in data
    assert "68.4%" in data["aggregate_comparison"]["average_cost_reduction"]
