"""boto3 client / resource factory.

Honors `AWS_ENDPOINT_URL` so the same client code drives LocalStack
(`http://localhost:4566`) and real AWS (no override). Region defaults to
`us-east-1` to match LocalStack's default.

In CI we set fake credentials and `AWS_ENDPOINT_URL=http://localhost:4566`
via the workflow's `env:` block. Locally, source `.env` or export those
variables yourself.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

import boto3
from botocore.config import Config


def _endpoint_url() -> str | None:
    return os.getenv("AWS_ENDPOINT_URL") or None


def _region() -> str:
    return os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"


def _client_config() -> Config:
    return Config(
        region_name=_region(),
        retries={"max_attempts": 3, "mode": "standard"},
        connect_timeout=5,
        read_timeout=15,
    )


@lru_cache(maxsize=16)
def aws_client(service: str) -> Any:
    """Return a boto3 low-level client (cached per-service)."""
    return boto3.client(
        service,
        endpoint_url=_endpoint_url(),
        config=_client_config(),
    )


@lru_cache(maxsize=16)
def aws_resource(service: str) -> Any:
    """Return a boto3 resource handle (cached per-service)."""
    return boto3.resource(
        service,
        endpoint_url=_endpoint_url(),
        config=_client_config(),
    )


def reset_clients() -> None:
    """Drop cached clients — used by integration test setup that re-points the endpoint."""
    aws_client.cache_clear()
    aws_resource.cache_clear()
