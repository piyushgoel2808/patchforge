"""E-Commerce Order & Payment Pipeline (4-Stage Data Flow).

Flow:
  submit_checkout (ENTRYPOINT)
    -> UserModel.parse_user & serialize_user (SCHEMA_VALIDATOR in models.py)
    -> calculate_invoice (CORE_SERVICE)
    -> commit_ledger (STORAGE_ADAPTER)
"""

from typing import Dict, Any, List
from models import UserModel


def submit_checkout(raw_order_payload: Dict[str, Any]) -> Dict[str, Any]:
    """Stage 1 [ENTRYPOINT]: Receive raw checkout request and orchestrate order pipeline."""
    user_obj = UserModel.parse_user(
        {
            "id": raw_order_payload.get("id", 101),
            "name": raw_order_payload.get("username", "Alex Rivera"),
            "email": raw_order_payload.get("email", "ALEX@ENTERPRISE.IO"),
        }
    )
    serialized_user = user_obj.serialize_user()
    items: List[float] = raw_order_payload.get("items", [120.50, 49.99])
    invoice = calculate_invoice(serialized_user, items)
    return commit_ledger(invoice)


def calculate_invoice(validated_user: Dict[str, Any], items: List[float]) -> Dict[str, Any]:
    """Stage 3 [CORE_SERVICE]: Compute subtotal, tax, and grand total for validated user."""
    subtotal = round(sum(items), 2)
    tax = round(subtotal * 0.08, 2)
    grand_total = round(subtotal + tax, 2)
    return {
        "customer_id": validated_user["id"],
        "customer_email": validated_user["email"],
        "subtotal": subtotal,
        "tax": tax,
        "grand_total": grand_total,
    }


def commit_ledger(invoice_data: Dict[str, Any]) -> Dict[str, Any]:
    """Stage 4 [STORAGE_ADAPTER]: Persist transaction to immutable payment ledger."""
    return {
        "tx_status": "COMMITTED",
        "ledger_id": f"TX-{invoice_data['customer_id']}-9082",
        "grand_total": invoice_data["grand_total"],
        "customer_email": invoice_data["customer_email"],
    }
