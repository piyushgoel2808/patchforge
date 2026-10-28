"""Test suite enforcing strict Pydantic v2 migration and 4-stage E-Commerce checkout flow."""
import warnings
import pytest
from pydantic import ValidationError
from pydantic.warnings import PydanticDeprecatedSince20
from models import UserModel
from order_pipeline import submit_checkout


def test_user_creation_and_field_validator():
    user = UserModel(id=1, name="Alice Chen", email="ALICE@EXAMPLE.COM")
    assert user.email == "alice@example.com"
    assert user.id == 1
    assert user.name == "Alice Chen"


def test_invalid_email_validation():
    with pytest.raises(ValidationError):
        UserModel(id=2, name="Bob", email="invalid-email-address")


def test_modern_v2_model_config():
    # Strict Pydantic v2 audit: model must use ConfigDict (from_attributes=True), NOT legacy Config class
    assert hasattr(UserModel, "model_config"), "UserModel must declare modern model_config"
    assert not hasattr(UserModel, "Config"), "Legacy nested 'class Config' must be removed in favor of model_config"
    assert UserModel.model_config.get("from_attributes") is True, "model_config must set from_attributes=True"


def test_modern_v2_serialization_and_parse_without_deprecation_warnings():
    # End-to-end 4-stage checkout pipeline must execute cleanly with zero Pydantic v1 deprecation warnings
    with warnings.catch_warnings():
        warnings.simplefilter("error", PydanticDeprecatedSince20)
        receipt = submit_checkout(
            {
                "id": 901,
                "username": "Alex Rivera",
                "email": "ALEX@ENTERPRISE.IO",
                "items": [120.50, 49.99],
            }
        )
        assert receipt["tx_status"] == "COMMITTED"
        assert receipt["customer_email"] == "alex@enterprise.io"
        assert receipt["grand_total"] == 184.13
