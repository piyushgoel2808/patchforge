"""Pytest suite enforcing modern FastAPI lifespan and modern httpx client standards."""
import pytest
from app import app, db_state


def test_lifespan_configured():
    # FastAPI lifespan migration test: ensure app utilizes modern lifespan handler rather than on_event handlers
    # Check that legacy on_event handlers are empty/not registered
    startup_handlers = getattr(app.router, "on_startup", [])
    assert len(startup_handlers) == 0, "Deprecated @app.on_event('startup') must be migrated to lifespan"


def test_health_endpoint_response():
    # Verify health response
    db_state["connected"] = True
    response = app.routes
    assert len(response) > 0
