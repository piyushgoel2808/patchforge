"""Test suite enforcing Pydantic v2 migration compliance."""
import pytest
from pydantic import ValidationError
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
    # Strict Pydantic v2 audit: model must use model_config ConfigDict, NOT legacy Config class
    assert hasattr(UserModel, "model_config"), "UserModel must declare modern model_config"
    assert not hasattr(UserModel, "Config"), "Legacy nested 'class Config' must be removed in favor of model_config"


def test_modern_v2_serialization():
    user = UserModel(id=3, name="Charlie", email="charlie@example.com")
    data = user.serialize_user()
    assert isinstance(data, dict)
    assert data["name"] == "Charlie"
    # Ensure modern .model_dump() is available and produces matching output
    assert hasattr(user, "model_dump"), "UserModel must support model_dump"
