"""Pytest suite enforcing modern FastAPI lifespan and modern httpx ASGITransport standards."""
import pytest
import httpx
from app import app, db_state


def test_lifespan_configured():
    # FastAPI lifespan migration test: ensure app utilizes modern lifespan handler rather than deprecated on_event handlers
    startup_handlers = getattr(app.router, "on_startup", [])
    assert len(startup_handlers) == 0, "Deprecated @app.on_event('startup') must be migrated to @asynccontextmanager lifespan"


@pytest.mark.asyncio
async def test_health_endpoint_with_asgi_transport():
    # BROKEN IN HTTPX >= 0.27: Passing app=app directly to AsyncClient was removed; must use httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "db_connected": True}
