"""Configuration module for PatchForge with dynamic Nebius Token Factory model resolution."""

import os
import logging
from typing import Dict, Any, Optional
import httpx
from dotenv import load_dotenv

# Load .env file
load_dotenv()

logger = logging.getLogger("patchforge.config")

# Fallback default model IDs if dynamic resolution fails or API key is not present
DEFAULT_MODELS = {
    "nano": os.getenv("NEBIUS_MODEL_NANO", "nvidia/nemotron-3-nano-30b-instruct"),
    "super": os.getenv("NEBIUS_MODEL_SUPER", "nvidia/nemotron-3-super-120b-instruct"),
    "ultra": os.getenv("NEBIUS_MODEL_ULTRA", "nvidia/nemotron-3-ultra-550b-instruct"),
}

# Pricing per million tokens (estimated Nebius Token Factory rates)
MODEL_PRICING = {
    "nano": {"prompt": 0.20, "completion": 0.20},      # $0.20 / 1M tokens
    "super": {"prompt": 0.80, "completion": 0.80},     # $0.80 / 1M tokens
    "ultra": {"prompt": 3.00, "completion": 3.00},     # $3.00 / 1M tokens
}


class Settings:
    """Application settings with dynamic model resolution."""

    def __init__(self):
        # Base URLs - Note: No trailing slash on base URL to avoid double-slash bugs with SDKs
        self.nebius_base_url: str = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1").rstrip("/")
        self.nebius_api_key: str = os.getenv("NEBIUS_API_KEY", "")
        self.tavily_api_key: str = os.getenv("TAVILY_API_KEY", "")

        # LangSmith
        self.langchain_tracing_v2: bool = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
        self.langchain_api_key: str = os.getenv("LANGCHAIN_API_KEY", "")
        self.langchain_project: str = os.getenv("LANGCHAIN_PROJECT", "patchforge")

        # Thresholds & Limits
        self.sandbox_timeout_seconds: int = int(os.getenv("SANDBOX_TIMEOUT_SECONDS", "15"))
        self.max_healing_retries: int = int(os.getenv("MAX_HEALING_RETRIES", "3"))
        self.confidence_threshold_docs: float = float(os.getenv("CONFIDENCE_THRESHOLD_DOCS", "0.90"))
        self.confidence_threshold_ultra: float = float(os.getenv("CONFIDENCE_THRESHOLD_ULTRA", "0.85"))

        # Model Registry cache
        self.resolved_models: Dict[str, str] = DEFAULT_MODELS.copy()
        self.is_nebius_connected: bool = False
        self.is_tavily_connected: bool = bool(self.tavily_api_key and self.tavily_api_key != "your_tavily_api_key_here")

    async def resolve_nebius_models(self) -> Dict[str, str]:
        """Dynamically query Nebius Token Factory /v1/models to resolve current model IDs."""
        if not self.nebius_api_key or self.nebius_api_key == "your_nebius_api_key_here":
            logger.info("No active NEBIUS_API_KEY found. Using calibrated default Nemotron 3 IDs in fallback simulation mode.")
            self.is_nebius_connected = False
            return self.resolved_models

        try:
            url = f"{self.nebius_base_url}/models"
            headers = {"Authorization": f"Bearer {self.nebius_api_key}"}

            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    models_list = [m.get("id", "") for m in data.get("data", [])]
                    logger.info("Discovered %d models on Nebius Token Factory", len(models_list))

                    # Map dynamic tier substrings
                    for mid in models_list:
                        mid_lower = mid.lower()
                        if "nano" in mid_lower and ("nemotron" in mid_lower or "nvidia" in mid_lower):
                            self.resolved_models["nano"] = mid
                        elif "super" in mid_lower and ("nemotron" in mid_lower or "nvidia" in mid_lower):
                            self.resolved_models["super"] = mid
                        elif "ultra" in mid_lower and ("nemotron" in mid_lower or "nvidia" in mid_lower):
                            self.resolved_models["ultra"] = mid

                    self.is_nebius_connected = True
                    logger.info("Successfully resolved Nebius models: %s", self.resolved_models)
                else:
                    logger.warning(
                        "Nebius Token Factory /models returned status %d. Utilizing resilient defaults.",
                        response.status_code
                    )
        except Exception as e:
            logger.warning("Dynamic model resolution failed: %s. Using default Nemotron mappings.", str(e))

        return self.resolved_models


settings = Settings()
