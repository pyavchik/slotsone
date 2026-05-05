"""Fixtures for AWS-integrated tests.

These tests run against either LocalStack or real AWS — anything that speaks
boto3 with the configured `AWS_ENDPOINT_URL`. The fixtures here create
ephemeral resources per session and tear them down in the finalizer.
"""

from __future__ import annotations

import os
import secrets

import pytest

from framework.aws.client_factory import aws_client, reset_clients


def _ensure_credentials() -> None:
    """LocalStack accepts any non-empty credentials; tests set fakes if absent."""
    os.environ.setdefault("AWS_ACCESS_KEY_ID", "test")
    os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "test")
    os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")


@pytest.fixture(scope="session", autouse=True)
def _aws_session_setup():
    """Three modes, decided in priority order:

    1. `CI_AWS_REAL=1` → run against real AWS using ambient credentials.
    2. `AWS_ENDPOINT_URL` set → run against LocalStack (or any boto3 endpoint).
    3. Neither → spin up an in-process `moto` ThreadedMotoServer on a free
       port and point boto3 at it. Zero infra requirement.
    """
    _ensure_credentials()

    if os.getenv("CI_AWS_REAL") == "1":
        reset_clients()
        yield
        return

    if os.getenv("AWS_ENDPOINT_URL"):
        reset_clients()
        yield
        return

    # In-process moto fallback.
    from moto.server import ThreadedMotoServer

    server = ThreadedMotoServer(ip_address="127.0.0.1", port=0)
    server.start()
    host, port = server.get_host_and_port()
    os.environ["AWS_ENDPOINT_URL"] = f"http://{host}:{port}"
    reset_clients()
    try:
        yield
    finally:
        server.stop()
        os.environ.pop("AWS_ENDPOINT_URL", None)
        reset_clients()


@pytest.fixture
def s3_bucket() -> str:
    """Create an ephemeral S3 bucket and delete it after the test."""
    name = f"qa-py-{secrets.token_hex(6)}"
    s3 = aws_client("s3")
    s3.create_bucket(Bucket=name)
    yield name
    # Cleanup: empty the bucket then delete.
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=name):
        for obj in page.get("Contents") or []:
            s3.delete_object(Bucket=name, Key=obj["Key"])
    s3.delete_bucket(Bucket=name)


@pytest.fixture
def sqs_queue() -> str:
    """Create an ephemeral SQS queue and delete it after the test."""
    name = f"qa-py-{secrets.token_hex(6)}"
    sqs = aws_client("sqs")
    resp = sqs.create_queue(QueueName=name)
    url = resp["QueueUrl"]
    yield url
    sqs.delete_queue(QueueUrl=url)


@pytest.fixture
def cloudwatch_log_group() -> str:
    """Create an ephemeral CloudWatch log group and delete it after the test."""
    name = f"/qa-py/{secrets.token_hex(6)}"
    logs = aws_client("logs")
    logs.create_log_group(logGroupName=name)
    yield name
    logs.delete_log_group(logGroupName=name)
