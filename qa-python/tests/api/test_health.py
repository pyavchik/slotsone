"""Liveness and readiness probes — smoke tier."""

from __future__ import annotations

import pytest

from framework.api_client import ApiClient
from framework.config import SETTINGS


@pytest.mark.smoke
@pytest.mark.api
def test_liveness_returns_ok(api: ApiClient) -> None:
    resp = api.get("/health").expect_ok()
    assert resp.body == {"status": "ok"}
    assert resp.elapsed_ms < SETTINGS.smoke_response_budget_ms


@pytest.mark.smoke
@pytest.mark.api
def test_readiness_includes_database_check(api: ApiClient) -> None:
    resp = api.get("/ready").expect_ok()
    assert resp.body["status"] == "ready"
    assert resp.body["checks"]["database"]["status"] == "ok"
