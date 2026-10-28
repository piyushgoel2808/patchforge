"""User data models - Deprecated Pydantic v1 implementation."""
from typing import Any, Dict
from pydantic import BaseModel, validator


class UserModel(BaseModel):
    id: int
    name: str
    email: str

    # DEPRECATED IN PYDANTIC V2: @validator is deprecated in favor of @field_validator
    @validator("email")
    def validate_email_domain(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid email format: missing @ symbol")
        return v.lower()

    # DEPRECATED IN PYDANTIC V2: nested Config class deprecated in favor of model_config = ConfigDict(...)
    class Config:
        orm_mode = True
        allow_population_by_field_name = True

    def serialize_user(self) -> Dict[str, Any]:
        # DEPRECATED IN PYDANTIC V2: .dict() deprecated in favor of .model_dump()
        return self.dict()

    @classmethod
    def parse_user(cls, payload: Dict[str, Any]) -> "UserModel":
        # DEPRECATED IN PYDANTIC V2: .parse_obj() deprecated in favor of .model_validate()
        return cls.parse_obj(payload)
