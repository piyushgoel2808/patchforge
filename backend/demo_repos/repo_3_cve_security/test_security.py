"""Security test suite auditing CVE-2020-1747 remediation, SQLi defense, and 4-stage RBAC pipeline."""
import sqlite3
import pytest
import yaml
from secure_service import load_config_safely, query_user_account
from auth_pipeline import ingest_auth_request


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
    # CVE-2020-1747: Unsafe yaml.load(..., Loader=yaml.Loader) executes arbitrary Python functions via !!python/object/apply
    # When patched with yaml.safe_load(), this payload MUST raise yaml.YAMLError instead of executing os.getenv
    malicious_payload = "!!python/object/apply:os.getenv ['PATH']"
    with pytest.raises(yaml.YAMLError):
        load_config_safely(malicious_payload)


def test_sql_injection_defense_and_rbac_pipeline(mock_db):
    # An attacker attempting authentication bypass via SQL injection: ' OR '1'='1
    malicious_input = "' OR '1'='1"
    results = query_user_account(mock_db, malicious_input)
    assert len(results) == 0, f"SQL injection vulnerability detected! Returned unexpected records: {results}"

    # Verify legitimate 4-stage RBAC token pipeline succeeds
    auth_res = ingest_auth_request(mock_db, "tenant: enterprise_prod\n", "admin")
    assert auth_res["authenticated"] is True
    assert auth_res["token"] == "jwt.enterprise_prod.admin.superuser"
