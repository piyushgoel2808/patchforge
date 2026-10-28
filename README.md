# 🛡️ PatchForge — Confidence-Gated Autonomous Repo Healer

> **Autonomous, closed-loop agentic software engineering platform built on Nebius Token Factory, NVIDIA Nemotron 3 models, and Tavily Live Web Grounding.**  
> Built for the **Coding & Agentic Engineering Track** at the **Nebius × NVIDIA Global AI Hackathon**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Nebius Token Factory](https://img.shields.io/badge/Inference-Nebius%20Token%20Factory-purple)](https://tokenfactory.nebius.com)
[![NVIDIA Nemotron 3](https://img.shields.io/badge/Models-NVIDIA%20Nemotron%203-76B900)](https://www.nvidia.com)
[![Tavily Search](https://img.shields.io/badge/Grounding-Tavily%20Live%20Search-blueviolet)](https://tavily.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%2B%20LangGraph-teal)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Tailwind-blue)](https://react.dev)

---

## ⚡ Problem Statement: Why Coding Agents Fail on Real Repositories

Modern software teams face continuous repository rot: upstream libraries release breaking major updates (e.g. Pydantic v1 to v2, FastAPI lifespan migrations, HTTPX `ASGITransport`), and newly disclosed Common Vulnerabilities and Exposures (CVEs) invalidate existing dependency trees overnight.

When developers use standard AI coding assistants to fix breaking upgrades or patch CVEs, three systemic failures occur:

1. **Training-Cutoff Hallucinations:** Static LLMs rely on frozen pre-training weights. When asked to migrate a deprecated API or patch a newly disclosed CVE, they hallucinate outdated syntax or non-existent methods because they lack live runtime access to current migration guides and security advisories.
2. **Blind One-Shot Generation ("Write and Pray"):** Most coding wrappers emit a code diff without executing the repository's test suite in an isolated runtime. The developer is forced to manually copy-paste patches, run tests, and feed stack traces back into a chat window.
3. **Runaway Inference Costs:** Running a frontier 500B+ reasoning model on every file in a repository to locate imports, parse ASTs, and iterate on minor syntax fixes burns massive token budgets and introduces severe latency.

---

## 🚀 The Solution: `PatchForge` (Web Studio + CLI Engine)

**PatchForge** is an autonomous, closed-loop agentic software engineering platform. Given a GitHub repository URL or a failing test log/CVE advisory, PatchForge clones the codebase into an isolated execution sandbox, diagnoses breaking changes, retrieves live documentation and CVE patches from the web via **Tavily**, synthesizes multi-file code migrations using **NVIDIA Nemotron 3**, runs the actual test suite (`pytest`), and self-heals until **100% of unit tests pass**.

```mermaid
flowchart TD
    subgraph Input ["Target Repository"]
        Repo["GitHub URL or Built-in Judge Scenario (1-Click)"]
    end

    subgraph Sandbox ["Isolated Execution Sandbox"]
        Clone["Temp Workspace Clone"]
        Pytest["Subprocess Pytest Runner (Async, 15s Timeout)"]
        Clone --> Pytest
    end

    subgraph Cascade ["4-Tier Agentic Cascade (Compiled LangGraph on Nebius Token Factory)"]
        direction TB
        T1["Tier 1: NVIDIA Nemotron 3 Nano 30B\n(AST & Stack Trace Triage, /no_think, Confidence Score)"]
        Gate1{"Confidence >= 0.90\n& No Unknown CVE/API?"}
        T2["Tier 2: Tavily Live Search API\n(Official Changelogs, 2026 CVEs, Migration Guides)"]
        Gate2{"Confidence >= 0.85\n& Single-File Change?"}
        T3["Tier 3: NVIDIA Nemotron 3 Ultra 550B\n(Deep MoE Multi-File Refactoring Plan)"]
        T4["Tier 4: NVIDIA Nemotron 3 Super 120B\n(Unified Git Diff Synthesis & AST Patching)"]
    end

    subgraph Verification ["Closed-Loop Self-Healing"]
        Apply["Apply Unified Diff to Workspace"]
        Verify["Re-run Pytest in Sandbox"]
        RetryCheck{"Tests Pass (100%)?"}
        Done(["✅ Status: HEALED_AND_VERIFIED"])
        Escalate(["⚠️ Status: ESCALATION_REVIEW"])
    end

    Input --> Clone
    Pytest -->|Failing Stderr & Traceback| T1
    T1 --> Gate1
    Gate1 -->|Yes| T4
    Gate1 -->|No / Deprecated API| T2
    T2 --> Gate2
    Gate2 -->|Yes| T4
    Gate2 -->|No / Complex| T3
    T3 --> T4
    T4 --> Apply
    Apply --> Verify
    Verify --> RetryCheck
    RetryCheck -->|Yes| Done
    RetryCheck -->|No & Retries < 3| T3
    RetryCheck -->|No & Retries >= 3| Escalate
```

---

## 🧠 4-Tier Model Cascade Architecture

| Tier | Engine / Model | Parameters / Specs | Role in PatchForge |
|---|---|---|---|
| **Tier 1: Triage** | **NVIDIA Nemotron 3 Nano** | Open-Weights (`/no_think`) | Scans repo AST, manifests, and stderr trace. Outputs Confidence Score ($0.00 - 1.00$) in $<200$ms. |
| **Tier 2: Grounding** | **Tavily Live Search API** | `search_depth="advanced"` | Fetches up-to-the-minute official migration guides, NVD CVE advisories, and GitHub issue diffs. |
| **Tier 3: Reasoning** | **NVIDIA Nemotron 3 Ultra** | Frontier Hybrid MoE | Formulates step-by-step architectural refactoring plans for low-confidence or multi-file issues. |
| **Tier 4: Synthesis** | **NVIDIA Nemotron 3 Super** | Hybrid Transformer-Mamba | Synthesizes surgical replacement files, computes unified Git diffs, and updates sandbox. |

---

## 📊 Agentic Cost & Accuracy Benchmark

Empirical and live-measurable benchmark comparison across 3 real-world migration and CVE scenarios:

| Metric | Nemotron 3 Nano Only | Monolithic Nemotron 3 Ultra Only | PatchForge 4-Tier Cascade |
|---|---|---|---|
| **Pass@1 Accuracy** | 50.0% (Fails strict v2 / multi-file ASTs) | **100%** | **100% (Zero Accuracy Loss)** |
| **Average Cost per Heal** | $0.00016 | $0.00678 | **$0.00214 (68.4% Lower Cost)** |
| **Average Step Latency** | 403 ms | 2,953 ms | **1,550 ms (47.5% Faster)** |
| **Grounding Freshness** | Pre-training cutoff (Static) | Pre-training cutoff (Static) | **Live 2026 Grounded (Tavily)** |

---

## 🎯 3 Built-in Judge Fast-Track Scenarios

1. **Scenario 1 (`repo_1_pydantic_v2`):**
   - **Failure:** Deprecated Pydantic v1 syntax (`@validator`, nested `class Config`, `.dict()`, `.parse_obj()`).
   - **Autonomous Heal:** Nano triages deprecation; Tavily retrieves Pydantic v2 migration guide; Super emits `@field_validator`, `ConfigDict`, `.model_dump()`, and `.model_validate()`.
2. **Scenario 2 (`repo_2_fastapi_lifespan`):**
   - **Failure:** Deprecated `@app.on_event("startup")` and removed `httpx.AsyncClient(app=app)` syntax.
   - **Autonomous Heal:** Tavily pulls ASGI lifespan & HTTPX docs; Ultra plans `@asynccontextmanager`; Super refactors `app.py` and `test_app.py` with `httpx.ASGITransport(app=app)`.
3. **Scenario 3 (`repo_3_cve_security`):**
   - **Failure:** Unsafe `yaml.load` arbitrary RCE (CVE-2020-1747) and SQL parameter injection.
   - **Autonomous Heal:** Tavily retrieves NVD CVE-2020-1747 patch; Ultra plans parameterized queries; Super applies `yaml.safe_load`.

---

## 🛠️ Quickstart (Web Application & CLI)

### 1. Clone & Configure API Keys
```bash
git clone https://github.com/piyushgoel2808/patchforge.git
cd patchforge

# Edit .env to add your NEBIUS_API_KEY and TAVILY_API_KEY
# (PatchForge reloads .env dynamically on every request!)
```

### 2. Run End-to-End LangGraph Pipeline Tests
```bash
./venv/bin/pytest -v backend/tests/test_pipeline.py
```

### 3. Run the PatchForge CLI Engine
```bash
# Check Nebius Token Factory & Tavily connection status
./venv/bin/python -m backend.cli health

# Autonomously heal a broken repository from the terminal
./venv/bin/python -m backend.cli heal --target scenario:repo_1_pydantic_v2

# Run the 3-scenario multi-model benchmark suite
./venv/bin/python -m backend.cli benchmark
```

### 4. Launch the Full Web Studio (FastAPI + React)
```bash
# Build frontend production assets
cd frontend && npm install && npm run build && cd ..

# Start FastAPI server (serves both API and compiled React UI on port 8000)
./venv/bin/uvicorn backend.main:app --reload --port 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### 5. One-Command Docker Deployment
```bash
docker compose up --build
```

---

## 📄 Hackathon Submission & Feedback Report

See [DEVPOST_SUBMISSION.md](DEVPOST_SUBMISSION.md) for the complete Devpost submission text, the **5-Part Most Valuable Feedback** engineering report on Nebius Token Factory & NVIDIA Nemotron, and the demo video script.

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.
