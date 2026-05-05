from __future__ import annotations

import secrets
from dataclasses import dataclass

from faker import Faker

_fake = Faker()


@dataclass(frozen=True)
class Credentials:
    email: str
    password: str


def new_credentials() -> Credentials:
    suffix = secrets.token_hex(6)
    return Credentials(
        email=f"qa_py_{suffix}@test.slotsone.dev",
        password=f"Pass_{secrets.token_urlsafe(12)}",
    )


def fake_name() -> str:
    return _fake.name()
