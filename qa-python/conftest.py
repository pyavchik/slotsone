from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from framework.api_client import ApiClient
from framework.config import SETTINGS
from framework.data_factory import Credentials, new_credentials


@pytest.fixture(scope="session")
def settings():
    return SETTINGS


@pytest.fixture
def api() -> ApiClient:
    return ApiClient()


@pytest.fixture
def credentials() -> Credentials:
    return new_credentials()


@pytest.fixture
def authed_api(api: ApiClient, credentials: Credentials) -> ApiClient:
    """Register a fresh user and return an ApiClient pre-loaded with the access token."""
    resp = api.post(
        "/api/v1/auth/register",
        json_body={"email": credentials.email, "password": credentials.password},
    ).expect_ok(allowed=(201,))
    return api.with_token(resp.body["access_token"])
