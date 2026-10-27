"""Security test suite auditing CVE-2020-1747 remediation and SQL injection resistance."""
import sqlite3
import pytest
import yaml
from secure_service import load_config_safely, query_user_account


@pytest.fixture
def mock_db():
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, role TEXT)")
    cursor.execute("INSERT INTO users (id, username, role) VALUES (1, 'admin', 'superuser')")
    cursor.execute("INSERT INTO users (id, username, role) VALUES (2, 'guest', 'viewer')")
    conn.commit()
    yield conn
    conn.close()


def test_yaml_safe_loader_mitigates_cve():
    # Attempting to load an arbitrary python object payload must fail with YAMLError when safe_load is used
    malicious_payload = "!!python/object/apply:builtins.dict [('exploit', 'success')]"
    with pytest.raises(yaml.YAMLError):
        load_config_safely(malicious_payload)


def test_sql_injection_defense(mock_db):
    # An attacker attempting authentication bypass via SQL injection: ' OR '1'='1
    malicious_input = "' OR '1'='1"
    results = query_user_account(mock_db, malicious_input)
    # If vulnerable, it returns all users (len == 2). If patched with parameterized queries, it returns []
    assert len(results) == 0, f"SQL injection vulnerability detected! Returned unexpected records: {results}"
