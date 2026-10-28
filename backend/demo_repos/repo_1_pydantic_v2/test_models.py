"""Test suite enforcing strict Pydantic v2 migration compliance."""
import warnings
import pytest
from pydantic import ValidationError
from pydantic.warnings import PydanticDeprecatedSince20
from models import UserModel


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
    # Calling serialize_user() and parse_user() must use .model_dump() and .model_validate() with zero V1 deprecation warnings
    with warnings.catch_warnings():
        warnings.simplefilter("error", PydanticDeprecatedSince20)
        user = UserModel.parse_user({"id": 3, "name": "Charlie", "email": "CHARLIE@EXAMPLE.COM"})
        assert user.email == "charlie@example.com"
        data = user.serialize_user()
        assert data == {"id": 3, "name": "Charlie", "email": "charlie@example.com"}
