"""CloudWatch Logs emission — proves the framework can verify observability
post-conditions: an action triggered the expected structured log line.

Pattern modelled here: after calling an API, search the service's
CloudWatch log group for a marker (request id, error code, business event)
and fail the test if the log line is missing — catching silent regressions
in logging that pure HTTP-status checks miss.
"""

from __future__ import annotations

import time
import uuid

import pytest

from framework.aws.client_factory import aws_client
from framework.aws.cloudwatch_assertions import assert_log_contains


@pytest.mark.aws
@pytest.mark.smoke
def test_emitted_log_event_is_searchable(cloudwatch_log_group: str) -> None:
    logs = aws_client("logs")
    stream = "qa-py-stream"
    logs.create_log_stream(logGroupName=cloudwatch_log_group, logStreamName=stream)

    request_id = f"req-{uuid.uuid4()}"
    now_ms = int(time.time() * 1000)

    logs.put_log_events(
        logGroupName=cloudwatch_log_group,
        logStreamName=stream,
        logEvents=[
            {
                "timestamp": now_ms,
                "message": f'{{"level":"info","request_id":"{request_id}","msg":"spin_executed"}}',
            }
        ],
    )

    evt = assert_log_contains(
        cloudwatch_log_group,
        request_id,
        since_ms=now_ms - 1000,
        timeout_s=10,
        poll_interval_s=0.5,
    )
    assert request_id in evt["message"]
    assert "spin_executed" in evt["message"]


@pytest.mark.aws
@pytest.mark.negative
def test_missing_log_event_raises_with_context(cloudwatch_log_group: str) -> None:
    with pytest.raises(AssertionError, match="No CloudWatch log event"):
        assert_log_contains(
            cloudwatch_log_group,
            "this-string-will-never-appear",
            timeout_s=2,
            poll_interval_s=0.5,
        )
