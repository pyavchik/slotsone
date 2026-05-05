"""S3 artifact pipeline — proves the framework can verify post-conditions
on an S3 bucket (the canonical "artifact published" check that downstream
CDN / consumer pipelines depend on).

Pattern modelled here: a CI job uploads an Allure report bundle to S3, and
this test asserts the upload succeeded with the right metadata + cache
headers before downstream cache invalidation runs.
"""

from __future__ import annotations

import io

import pytest

from framework.aws.client_factory import aws_client
from framework.aws.s3_assertions import (
    assert_object_exists,
    assert_object_metadata,
    wait_for_object,
)


@pytest.mark.aws
@pytest.mark.smoke
def test_uploaded_object_passes_post_conditions(s3_bucket: str) -> None:
    s3 = aws_client("s3")
    key = "reports/allure-2026-05-05/index.html"
    body = b"<!doctype html><title>Allure</title>"

    s3.put_object(
        Bucket=s3_bucket,
        Key=key,
        Body=body,
        ContentType="text/html",
        CacheControl="public, max-age=3600",
        Metadata={"build-id": "ci-12345", "branch": "main"},
    )

    head = assert_object_exists(s3_bucket, key)
    assert head["ContentLength"] == len(body)

    assert_object_metadata(
        s3_bucket,
        key,
        content_type="text/html",
        cache_control="public, max-age=3600",
        metadata={"build-id": "ci-12345", "branch": "main"},
    )


@pytest.mark.aws
@pytest.mark.regression
def test_wait_for_object_polls_until_async_upload_completes(s3_bucket: str) -> None:
    """Producer publishes async — consumer polls. Even when the upload happens
    "later" the helper succeeds inside the timeout window."""
    import threading
    import time

    s3 = aws_client("s3")
    key = "async/payload.json"

    def delayed_upload() -> None:
        time.sleep(0.4)
        s3.put_object(Bucket=s3_bucket, Key=key, Body=b'{"ok":true}')

    threading.Thread(target=delayed_upload, daemon=True).start()

    head = wait_for_object(s3_bucket, key, timeout_s=5, poll_interval_s=0.2)
    assert head["ContentLength"] > 0


@pytest.mark.aws
@pytest.mark.negative
def test_missing_object_raises_assertion(s3_bucket: str) -> None:
    with pytest.raises(AssertionError, match="S3 object missing"):
        assert_object_exists(s3_bucket, "does/not/exist.txt")
