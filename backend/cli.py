"""PatchForge CLI Engine — Command-line interface for autonomous repository healing & benchmarking.

Usage:
  python -m backend.cli health
  python -m backend.cli heal --target scenario:repo_1_pydantic_v2
  python -m backend.cli heal --target https://github.com/owner/repo
  python -m backend.cli benchmark
"""

import argparse
import asyncio
import json
import sys
from backend.config import settings
from backend.core.sandbox_runner import sandbox_runner
from backend.core.benchmark_engine import benchmark_engine
from backend.agent.graph import stream_patchforge_execution
from backend.agent.state import PatchForgeState


async def cmd_health() -> int:
    models = await settings.resolve_nebius_models()
    print("=" * 72)
    print("🛡️  PATCHFORGE — SYSTEM HEALTH & MODEL REGISTRY")
    print("=" * 72)
    print(f"Execution Mode       : {settings.execution_mode}")
    print(f"Nebius Token Factory : {'CONNECTED (LIVE)' if settings.is_nebius_connected else 'FALLBACK (Add NEBIUS_API_KEY in .env)'}")
    print(f"Nebius Base URL      : {settings.nebius_base_url}")
    print(f"  ├─ Tier 1 (Nano)   : {models.get('nano')}")
    print(f"  ├─ Tier 2 (Super)  : {models.get('super')}")
    print(f"  └─ Tier 3 (Ultra)  : {models.get('ultra')}")
    print(f"Tavily Search API    : {'CONNECTED (LIVE)' if settings.is_tavily_connected else 'FALLBACK (Add TAVILY_API_KEY in .env)'}")
    print(f"LangSmith Tracing    : {'ENABLED' if settings.is_langsmith_connected else 'DISABLED'}")
    print("=" * 72)
    return 0


async def cmd_heal(target: str) -> int:
    await settings.resolve_nebius_models()
    print("=" * 72)
    print(f"⚡ PATCHFORGE AUTONOMOUS REPO HEALER — Target: {target}")
    print("=" * 72)

    workspace_dir = await sandbox_runner.create_workspace(target)
    try:
        initial_state: PatchForgeState = {
            "target": target,
            "workspace_dir": workspace_dir,
            "retry_count": 0,
            "status": "INITIALIZING",
            "execution_mode": settings.execution_mode,
            "telemetry_steps": [],
            "step_timings": {},
            "skipped_nodes": [],
            "cumulative_cost_usd": 0.0,
            "cumulative_ultra_baseline_cost_usd": 0.0,
            "cumulative_dollars_saved_usd": 0.0,
            "total_tokens": 0,
            "final_success": False,
        }

        async for evt in stream_patchforge_execution(initial_state):
            etype = evt.get("event")
            data = evt.get("data", {})
            if etype == "node_start":
                print(f"\n▶ [{data.get('node')}] {data.get('label')}...")
            elif etype == "node_complete":
                node = data.get("node")
                dur = data.get("duration_ms", 0.0)
                if node == "run_initial_tests":
                    out = data.get("test_output", {})
                    print(f"  ✗ Baseline Pytest Failed ({dur:.0f}ms) | Failed: {out.get('failed_tests')}")
                elif node == "triage_with_nano":
                    print(f"  ✓ Nano Triage ({dur:.0f}ms) | Confidence: {data.get('confidence', 0)*100:.0f}%")
                    print(f"    Root Cause: {data.get('root_cause')}")
                elif node == "ground_with_tavily":
                    cits = data.get("citations", [])
                    print(f"  ✓ Tavily Grounding ({dur:.0f}ms) | Citations fetched: {len(cits)}")
                    for c in cits[:2]:
                        print(f"    - {c.get('title')} ({c.get('url')})")
                elif node == "plan_with_ultra":
                    print(f"  ✓ Ultra 550B Refactor Plan Generated ({dur:.0f}ms)")
                elif node == "synthesize_patch_with_super":
                    print(f"  ✓ Super 120B Synthesized Unified Diff ({dur:.0f}ms)")
                    print(f"    Explanation: {data.get('patch_explanation')}")
                elif node == "verify_patch_in_sandbox":
                    print(f"  ✓ Sandbox Verification ({dur:.0f}ms) -> Status: {data.get('status')}")
            elif etype == "workflow_complete":
                print("\n" + "=" * 72)
                print(f"✅ WORKFLOW COMPLETE — Status: {data.get('status')}")
                print(f"Total Cascade Cost   : ${data.get('total_cost_usd', 0):.6f}")
                print(f"Saved vs Ultra Only  : ${data.get('total_dollars_saved', 0):.6f}")
                print(f"Total Tokens         : {data.get('total_tokens', 0)}")
                print(f"Total Duration       : {data.get('duration_ms', 0):.1f}ms")
                print("=" * 72)
                if data.get("combined_diff"):
                    print("\n--- UNIFIED GIT DIFF ---")
                    print(data["combined_diff"])
                return 0 if data.get("final_success") else 1
    finally:
        sandbox_runner.cleanup(workspace_dir)
    return 0


async def cmd_benchmark() -> int:
    await settings.resolve_nebius_models()
    print("=" * 72)
    print("📊 PATCHFORGE LIVE MULTI-MODEL BENCHMARK SUITE")
    print("=" * 72)
    for sc_id in ["repo_1_pydantic_v2", "repo_2_fastapi_lifespan", "repo_3_cve_security"]:
        res = await benchmark_engine.run_live_benchmark_scenario(sc_id)
        print(
            f"✓ {sc_id:<26} | Pass: {'100%' if res['passed'] else 'FAIL'} "
            f"| Cascade: ${res['cascade_total_cost_usd']:.5f} "
            f"| Ultra Only: ${res['monolithic_estimated_cost_usd']:.5f} "
            f"| Saved: {res['measured_savings_pct']}%"
        )
    agg = benchmark_engine.get_empirical_benchmarks()["aggregate_comparison"]
    print("-" * 72)
    print(
        f"Aggregate Cost Reduction: {agg['average_cost_reduction']} | "
        f"Latency Reduction: {agg['average_latency_reduction']} | "
        f"Cascade Pass@1: {agg['pass_rate_cascade']}"
    )
    print("=" * 72)
    return 0


def main():
    parser = argparse.ArgumentParser(description="PatchForge CLI Engine")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("health", help="Check Nebius Token Factory & Tavily connection health")

    heal_p = sub.add_parser("heal", help="Autonomously heal a scenario or GitHub repo URL")
    heal_p.add_argument(
        "--target",
        default="scenario:repo_1_pydantic_v2",
        help="Scenario ID (e.g. scenario:repo_1_pydantic_v2) or GitHub URL",
    )

    sub.add_parser("benchmark", help="Run the 3-scenario Cost & Latency Benchmark suite")

    args = parser.parse_args()
    if args.command == "health":
        sys.exit(asyncio.run(cmd_health()))
    elif args.command == "heal":
        sys.exit(asyncio.run(cmd_heal(args.target)))
    elif args.command == "benchmark":
        sys.exit(asyncio.run(cmd_benchmark()))


if __name__ == "__main__":
    main()
