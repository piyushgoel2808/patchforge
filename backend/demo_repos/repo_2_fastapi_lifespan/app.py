"""FastAPI application with deprecated startup event handlers and task dispatch route."""
from typing import Dict, Any
from fastapi import FastAPI
from task_pipeline import dispatch_worker_task

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
async def health_check():
    res = dispatch_worker_task({"job": "health_probe", "priority": "HIGH"}, db_state["connected"])
    return {"status": res["status"], "db_connected": db_state["connected"]}
