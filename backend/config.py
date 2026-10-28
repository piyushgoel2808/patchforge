"""Configuration module for PatchForge with dynamic Nebius Token Factory model resolution."""

import os
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import httpx
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE_PATH = PROJECT_ROOT / ".env"

# Load .env file if present
load_dotenv(dotenv_path=ENV_FILE_PATH, override=True)

logger = logging.getLogger("patchforge.config")

# Default model IDs aligned with Nebius Token Factory NVIDIA Nemotron offerings
DEFAULT_MODELS = {
    "nano": os.getenv("NEBIUS_MODEL_NANO", "nvidia/Llama-3.1-Nemotron-Nano-8B-v1"),
    "super": os.getenv("NEBIUS_MODEL_SUPER", "nvidia/Llama-3.3-Nemotron-Super-49B-v1"),
    "ultra": os.getenv("NEBIUS_MODEL_ULTRA", "nvidia/Llama-3.1-Nemotron-Ultra-253B-v1"),
}

# Pricing per million tokens (Nebius Token Factory rates across tiers)
MODEL_PRICING = {
    "nano": {"prompt": 0.20, "completion": 0.20},      # $0.20 / 1M tokens
    "super": {"prompt": 0.80, "completion": 0.80},     # $0.80 / 1M tokens
    "ultra": {"prompt": 3.00, "completion": 3.00},     # $3.00 / 1M tokens
}

PLACEHOLDER_KEYS = {
    "",
    "your_nebius_api_key_here",
    "your_tavily_api_key_here",
    "your_langsmith_api_key_here",
}


def _is_valid_key(val: Optional[str]) -> bool:
    return bool(val and val.strip() and val.strip() not in PLACEHOLDER_KEYS)


class Settings:
    """Application settings with live .env reloading and dynamic model resolution."""

    def __init__(self):
        self.resolved_models: Dict[str, str] = DEFAULT_MODELS.copy()
        self.available_nebius_models: List[str] = []
        self.is_nebius_connected: bool = False
        self.is_tavily_connected: bool = False
        self.is_langsmith_connected: bool = False
        self.reload_env()

    def reload_env(self) -> None:
        """Reload environment variables from .env so newly added keys take effect immediately."""
        load_dotenv(dotenv_path=ENV_FILE_PATH, override=True)

        # Base URL - No trailing slash to avoid /v1//chat/completions double-slash bug
        self.nebius_base_url: str = os.getenv(
            "NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1"
        ).rstrip("/")
        self.nebius_api_key: str = os.getenv("NEBIUS_API_KEY", "").strip()
        self.tavily_api_key: str = os.getenv("TAVILY_API_KEY", "").strip()

        # LangSmith observability settings
        self.langchain_tracing_v2: bool = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
        self.langchain_api_key: str = os.getenv("LANGCHAIN_API_KEY", "").strip()
        self.langchain_project: str = os.getenv("LANGCHAIN_PROJECT", "patchforge-nebius-nvidia")

        # Configure os.environ for LangGraph / LangSmith native tracing if key is valid
        if _is_valid_key(self.langchain_api_key) and self.langchain_tracing_v2:
            os.environ["LANGCHAIN_TRACING_V2"] = "true"
            os.environ["LANGCHAIN_API_KEY"] = self.langchain_api_key
            os.environ["LANGCHAIN_PROJECT"] = self.langchain_project
            self.is_langsmith_connected = True
        else:
            os.environ["LANGCHAIN_TRACING_V2"] = "false"
            self.is_langsmith_connected = False

        # Thresholds & Limits
        self.sandbox_timeout_seconds: int = int(os.getenv("SANDBOX_TIMEOUT_SECONDS", "15"))
        self.max_healing_retries: int = int(os.getenv("MAX_HEALING_RETRIES", "3"))
        self.confidence_threshold_docs: float = float(os.getenv("CONFIDENCE_THRESHOLD_DOCS", "0.90"))
        self.confidence_threshold_ultra: float = float(os.getenv("CONFIDENCE_THRESHOLD_ULTRA", "0.85"))

        # Respect explicit env overrides for model slugs if set
        if os.getenv("NEBIUS_MODEL_NANO"):
            self.resolved_models["nano"] = os.getenv("NEBIUS_MODEL_NANO", DEFAULT_MODELS["nano"])
        if os.getenv("NEBIUS_MODEL_SUPER"):
            self.resolved_models["super"] = os.getenv("NEBIUS_MODEL_SUPER", DEFAULT_MODELS["super"])
        if os.getenv("NEBIUS_MODEL_ULTRA"):
            self.resolved_models["ultra"] = os.getenv("NEBIUS_MODEL_ULTRA", DEFAULT_MODELS["ultra"])

        self.is_tavily_connected = _is_valid_key(self.tavily_api_key)
        if not _is_valid_key(self.nebius_api_key):
            self.is_nebius_connected = False

    @property
    def has_nebius_key(self) -> bool:
        return _is_valid_key(self.nebius_api_key)

    @property
    def has_tavily_key(self) -> bool:
        return _is_valid_key(self.tavily_api_key)

    @property
    def execution_mode(self) -> str:
        return "LIVE_API" if (self.has_nebius_key or self.has_tavily_key) else "SIMULATED_FALLBACK"

    async def resolve_nebius_models(self) -> Dict[str, str]:
        """Dynamically query Nebius Token Factory GET /v1/models to map Nano, Super, and Ultra tiers."""
        self.reload_env()
        if not self.has_nebius_key:
            logger.info(
                "No live NEBIUS_API_KEY configured. Running with calibrated Nemotron tier IDs in fallback mode."
            )
            self.is_nebius_connected = False
            return self.resolved_models

        try:
            url = f"{self.nebius_base_url}/models"
            headers = {"Authorization": f"Bearer {self.nebius_api_key}"}

            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    models_list = [m.get("id", "") for m in data.get("data", []) if m.get("id")]
                    self.available_nebius_models = models_list
                    logger.info("Discovered %d models on Nebius Token Factory", len(models_list))

                    nemotron_models = [
                        m for m in models_list
                        if "nemotron" in m.lower() or "nvidia" in m.lower()
                    ]

                    # Map Nano, Super, Ultra across Nemotron 3 and Llama-3.x-Nemotron naming conventions
                    nano_candidates = [
                        m for m in nemotron_models
                        if any(k in m.lower() for k in ("nano", "8b", "30b", "mini", "fast"))
                    ]
                    super_candidates = [
                        m for m in nemotron_models
                        if any(k in m.lower() for k in ("super", "49b", "70b", "120b"))
                    ]
                    ultra_candidates = [
                        m for m in nemotron_models
                        if any(k in m.lower() for k in ("ultra", "253b", "340b", "550b"))
                    ]

                    if nano_candidates:
                        self.resolved_models["nano"] = nano_candidates[0]
                    elif nemotron_models:
                        self.resolved_models["nano"] = nemotron_models[0]

                    if super_candidates:
                        self.resolved_models["super"] = super_candidates[0]
                    elif nemotron_models:
                        self.resolved_models["super"] = nemotron_models[min(1, len(nemotron_models) - 1)]

                    if ultra_candidates:
                        self.resolved_models["ultra"] = ultra_candidates[0]
                    elif nemotron_models:
                        self.resolved_models["ultra"] = nemotron_models[-1]

                    self.is_nebius_connected = True
                    logger.info("Resolved live Nebius Token Factory models: %s", self.resolved_models)
                else:
                    logger.warning(
                        "Nebius Token Factory /v1/models returned HTTP %d. Using configured model IDs.",
                        response.status_code,
                    )
                    self.is_nebius_connected = True
        except Exception as e:
            logger.warning("Dynamic model resolution failed (%s). Using fallback model mappings.", str(e))

        return self.resolved_models


settings = Settings()
