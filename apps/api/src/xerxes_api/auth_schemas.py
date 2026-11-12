"""Private authentication response shapes; credentials never enter public schemas."""

import re
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator

from xerxes_api.schemas import ApiModel


def normalize_username(value: str) -> str:
    username = value.strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9@._+-]{2,119}", username):
        raise ValueError("Use a username of 3–120 letters, digits or @ . _ + -")
    return username


class LoginInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=3, max_length=120)
    # Preserve intentional spaces in a password; do not inherit global text stripping.
    password: str = Field(min_length=1, max_length=1024)

    @field_validator("username")
    @classmethod
    def valid_username(cls, value):
        return normalize_username(value)


class ReviewerIdentity(ApiModel):
    id: UUID
    username: str
    role: Literal["moderator", "admin"]


class AuthSession(ApiModel):
    authenticated: Literal[True] = True
    reviewer: ReviewerIdentity
    csrf_token: str
    expires_at: AwareDatetime
