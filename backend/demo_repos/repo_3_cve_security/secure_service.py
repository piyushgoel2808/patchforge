"""Security service with CVE-2020-1747 and SQL injection vulnerabilities."""
import yaml
import sqlite3
from typing import Any, Dict


def load_config_safely(yaml_string: str) -> Dict[str, Any]:
    # VULNERABLE: Uses unsafe Loader=yaml.Loader enabling arbitrary code execution (CVE-2020-1747)
    return yaml.load(yaml_string, Loader=yaml.Loader)


def query_user_account(db_conn: sqlite3.Connection, username: str) -> list:
    cursor = db_conn.cursor()
    # VULNERABLE: Direct string interpolation vulnerable to SQL injection
    query = f"SELECT id, username, role FROM users WHERE username = '{username}'"
    cursor.execute(query)
    return cursor.fetchall()
