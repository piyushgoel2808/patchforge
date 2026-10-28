"""Enterprise Auth & RBAC Token Pipeline (Stages 1 & 4 of Security Core)."""

import sqlite3
from typing import Dict, Any, List
from secure_service import load_config_safely, query_user_account


def ingest_auth_request(db_conn: sqlite3.Connection, raw_yaml_config: str, username: str) -> Dict[str, Any]:
    """Stage 1 [ENTRYPOINT]: Parse tenant YAML configuration and authenticate user."""
    config = load_config_safely(raw_yaml_config)
    matched_users = query_user_account(db_conn, username)
    return issue_rbac_token(matched_users, config)


def issue_rbac_token(user_records: List[Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """Stage 4 [CORE_SERVICE]: Mint RBAC session token only for verified single-user records."""
    if len(user_records) != 1:
        return {"authenticated": False, "token": None, "reason": "Invalid user lookup count"}
    user_id, uname, role = user_records[0]
    tenant = config.get("tenant", "default") if isinstance(config, dict) else "default"
    return {
        "authenticated": True,
        "username": uname,
        "role": role,
        "token": f"jwt.{tenant}.{uname}.{role}",
    }
