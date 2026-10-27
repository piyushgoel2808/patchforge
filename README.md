# 🛡️ PatchForge — Confidence-Gated Autonomous Repo Healer

> **Autonomous, closed-loop agentic software engineering platform built on Nebius Token Factory, NVIDIA Nemotron 3 models, and Tavily Live Web Grounding.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Nebius Token Factory](https://img.shields.io/badge/Inference-Nebius%20Token%20Factory-purple)](https://tokenfactory.nebius.com)
[![NVIDIA Nemotron 3](https://img.shields.io/badge/Models-NVIDIA%20Nemotron%203-76B900)](https://www.nvidia.com)
[![Tavily Search](https://img.shields.io/badge/Grounding-Tavily%20Live%20Search-blueviolet)](https://tavily.com)

---

## ⚡ Problem Statement: Why Coding Agents Fail on Real Repositories

1. **Training-Cutoff Hallucinations:** Static LLMs rely on frozen weights. Upstream major releases (Pydantic v1→v2, FastAPI lifespans, LangChain 0.1→0.3) and 2026 CVEs cause static models to hallucinate outdated APIs.
2. **Blind One-Shot Generation ("Write and Pray"):** Existing coding wrappers emit unverified diffs without running local sandboxed test suites.
3. **Runaway Inference Costs:** Running frontier 500B+ models across entire repositories drains token budgets with prohibitive latency.

---

## 🚀 The Solution: PatchForge 4-Tier Cascade Architecture

PatchForge clones target repositories into isolated sandboxes, identifies breaking changes, dynamically grounds solutions using Tavily live search, synthesizes multi-file patches, runs unit tests, and self-heals in a closed loop.

```mermaid
flowchart TD
    Repo[Failing GitHub Repo / Judge Scenario] --> Sandbox[Isolated Pytest Sandbox]
    Sandbox -->|Failing Stderr & AST| Tier1[Tier 1: NVIDIA Nemotron 3 Nano 30B\nAST Triage & Confidence Gate]
    
    Tier1 -->|Confidence >= 0.90 & Clean| Tier4[Tier 4: NVIDIA Nemotron 3 Super 120B\nUnified Diff Synthesis]
    Tier1 -->|Confidence < 0.90 OR Needs Docs| Tier2[Tier 2: Tavily Live Search API\nChangelogs, CVEs & Migration Docs]
    
    Tier2 -->|Confidence >= 0.85| Tier4
    Tier2 -->|Confidence < 0.85 OR Complex Refactor| Tier3[Tier 3: NVIDIA Nemotron 3 Ultra 550B\nMulti-File Architectural Plan]
    
    Tier3 --> Tier4
    Tier4 -->|Apply Diff| Verify[Verify in Sandbox: pytest -v]
    
    Verify -->|Tests Pass (100%)| Success([✅ Healed & Verified])
    Verify -->|Tests Fail & Retry < 3| Tier3
    Verify -->|Max Retries Exceeded| Failed([❌ Escalation Review])
```

---

## 🛠️ Tech Stack & Key Integrations

| Layer | Technology | Role |
|---|---|---|
| **Inference Backbone** | **Nebius Token Factory** (`https://api.tokenfactory.nebius.com/v1`) | High-throughput OpenAI-compatible endpoint |
| **Tier 1 (Triage)** | **NVIDIA Nemotron 3 Nano 30B** (`/no_think`) | Sub-second AST triage & confidence scoring ($0.00 - 1.00$) |
| **Tier 2 (Grounding)** | **Tavily Search & Extract API** | Live 2026 CVE advisories & breaking change migration docs |
| **Tier 3 (Planning)** | **NVIDIA Nemotron 3 Ultra 550B** | Hybrid MoE deep architectural refactoring planner |
| **Tier 4 (Synthesis)** | **NVIDIA Nemotron 3 Super 120B** | 120B Transformer-Mamba hybrid diff synthesis & code emitter |
| **Sandbox Execution** | **Python Subprocess / Docker** | Isolated `pytest` runner with stdout/stderr capture |
| **Backend & Orchestration**| **FastAPI + LangGraph** | SSE event streaming, state machine with self-healing loop |
| **Frontend UI** | **React + Vite + Tailwind CSS + Lucide** | Judge 1-click scenarios, live agent visualizer, diffs & telemetry |

---

## 🏁 Quickstart

```bash
# Clone the repository
git clone https://github.com/piyushgoel2808/patchforge.git
cd patchforge

# Setup environment variables
cp .env.example .env
# Edit .env with your NEBIUS_API_KEY and TAVILY_API_KEY

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend setup (in a separate terminal)
cd ../frontend
npm install
npm run dev
```

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.
