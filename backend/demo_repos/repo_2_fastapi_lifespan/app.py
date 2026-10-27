"""FastAPI application with deprecated startup event handlers."""
from fastapi import FastAPI

db_state = {"connected": False}

# DEPRECATED IN FASTAPI: @app.on_event("startup") is deprecated in favor of lifespan context manager
app = FastAPI(title="Legacy Events Microservice")


@app.on_event("startup")
def startup_db_client():
    db_state["connected"] = True


@app.on_event("shutdown")
def shutdown_db_client():
    db_state["connected"] = False


@app.get("/health")
def health_check():
    return {"status": "ok", "db_connected": db_state["connected"]}
