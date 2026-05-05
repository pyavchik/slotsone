from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from typing import Any

import requests

from framework.config import SETTINGS


@dataclass
class ApiResponse:
    status: int
    body: Any
    headers: requests.structures.CaseInsensitiveDict
    elapsed_ms: float

    def json(self) -> Any:
        return self.body

    def expect_ok(self, *, allowed: tuple[int, ...] = (200, 201)) -> "ApiResponse":
        if self.status not in allowed:
            raise AssertionError(
                f"Unexpected status {self.status} (allowed={allowed}); body={self.body!r}"
            )
        return self


class ApiClient:
    """Thin Requests wrapper that normalizes auth, JSON, timing, and errors."""

    def __init__(self, base_url: str | None = None, token: str | None = None) -> None:
        self.base_url = (base_url or SETTINGS.api_base_url).rstrip("/")
        self._session = requests.Session()
        self._token = token

    def with_token(self, token: str) -> "ApiClient":
        self._token = token
        return self

    def clear_token(self) -> "ApiClient":
        self._token = None
        return self

    def request(
        self,
        method: str,
        path: str,
        *,
        json_body: Any | None = None,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        token: str | None = None,
    ) -> ApiResponse:
        url = f"{self.base_url}{path}"
        merged = {"Accept": "application/json"}
        if json_body is not None:
            merged["Content-Type"] = "application/json"
        effective_token = token if token is not None else self._token
        if effective_token:
            merged["Authorization"] = f"Bearer {effective_token}"
        if headers:
            merged.update(headers)

        start = time.perf_counter()
        resp = self._session.request(
            method=method.upper(),
            url=url,
            json=json_body,
            params=params,
            headers=merged,
            timeout=SETTINGS.request_timeout_s,
        )
        elapsed_ms = (time.perf_counter() - start) * 1000.0

        ctype = resp.headers.get("content-type", "")
        body: Any = resp.json() if ctype.startswith("application/json") else resp.text
        return ApiResponse(
            status=resp.status_code,
            body=body,
            headers=resp.headers,
            elapsed_ms=elapsed_ms,
        )

    def get(self, path: str, **kw: Any) -> ApiResponse:
        return self.request("GET", path, **kw)

    def post(self, path: str, **kw: Any) -> ApiResponse:
        return self.request("POST", path, **kw)


def new_idempotency_key() -> str:
    return f"idem-{uuid.uuid4()}"
