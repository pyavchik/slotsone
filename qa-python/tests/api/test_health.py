"""Liveness and readiness probes — smoke tier.

These endpoints are infrastructure-tier (Docker healthcheck, k8s liveness).
On deployments where a CDN / SPA-fronting reverse proxy intercepts root
paths (e.g. Caddy serving `index.html` at `/health`), the probes are not
publicly reachable and the tests skip rather than fail.
"""

from __future__ import annotations

import pytest

from framework.api_client import ApiClient, ApiResponse
from framework.config import SETTINGS


def _require_json(resp: ApiResponse) -> dict:
    if not isinstance(resp.body, dict):
        pytest.skip(
            "Endpoint did not return JSON — likely SPA-fronted at this base URL "
            "(infra probes are not exposed publicly on prod). "
            f"Got content-type={resp.headers.get('content-type')!r}"
        )
    return resp.body


@pytest.mark.smoke
@pytest.mark.api
def test_liveness_returns_ok(api: ApiClient) -> None:
    resp = api.get("/health").expect_ok()
    body = _require_json(resp)
    assert body == {"status": "ok"}
    assert resp.elapsed_ms < SETTINGS.smoke_response_budget_ms


@pytest.mark.smoke
@pytest.mark.api
def test_readiness_includes_database_check(api: ApiClient) -> None:
    resp = api.get("/ready").expect_ok()
    body = _require_json(resp)
    assert body["status"] == "ready"
    assert body["checks"]["database"]["status"] == "ok"
