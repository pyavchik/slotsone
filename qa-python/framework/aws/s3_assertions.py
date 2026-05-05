"""S3 object assertions used by tests that verify post-conditions on S3."""

from __future__ import annotations

import time
from typing import Any

from botocore.exceptions import ClientError

from framework.aws.client_factory import aws_client


def _head_object(bucket: str, key: str) -> dict[str, Any] | None:
    try:
        return aws_client("s3").head_object(Bucket=bucket, Key=key)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code")
        if code in ("404", "NoSuchKey", "NotFound"):
            return None
        raise


def assert_object_exists(bucket: str, key: str) -> dict[str, Any]:
    """Fail unless `s3://bucket/key` exists. Returns the head-object response."""
    head = _head_object(bucket, key)
    if head is None:
        raise AssertionError(f"S3 object missing: s3://{bucket}/{key}")
    return head


def wait_for_object(
    bucket: str,
    key: str,
    *,
    timeout_s: float = 10.0,
    poll_interval_s: float = 0.5,
) -> dict[str, Any]:
    """Poll until the object appears or the timeout elapses.

    Use this when an upload is asynchronous (e.g. triggered by a Lambda
    or a queue worker) and the test cannot synchronise on the producer.
    """
    deadline = time.monotonic() + timeout_s
    last_error: str | None = None
    while time.monotonic() < deadline:
        head = _head_object(bucket, key)
        if head is not None:
            return head
        last_error = f"still missing at {time.monotonic():.2f}"
        time.sleep(poll_interval_s)
    raise AssertionError(
        f"S3 object did not appear within {timeout_s}s: s3://{bucket}/{key} ({last_error})"
    )


def assert_object_metadata(
    bucket: str,
    key: str,
    *,
    content_type: str | None = None,
    cache_control: str | None = None,
    metadata: dict[str, str] | None = None,
) -> None:
    """Validate the headers + user metadata on an existing S3 object."""
    head = assert_object_exists(bucket, key)

    if content_type is not None:
        actual = head.get("ContentType")
        if actual != content_type:
            raise AssertionError(
                f"ContentType mismatch on s3://{bucket}/{key}: "
                f"expected {content_type!r}, got {actual!r}"
            )

    if cache_control is not None:
        actual = head.get("CacheControl")
        if actual != cache_control:
            raise AssertionError(
                f"CacheControl mismatch on s3://{bucket}/{key}: "
                f"expected {cache_control!r}, got {actual!r}"
            )

    if metadata:
        actual = head.get("Metadata") or {}
        for k, expected in metadata.items():
            if actual.get(k) != expected:
                raise AssertionError(
                    f"User metadata mismatch on s3://{bucket}/{key} key={k!r}: "
                    f"expected {expected!r}, got {actual.get(k)!r}"
                )
