"""CloudWatch Logs assertions.

Tests that exercise an API can verify the system emitted the expected log
line — useful for catching silent regressions in observability that pure
HTTP-status checks miss.
"""

from __future__ import annotations

import time
from typing import Any

from botocore.exceptions import ClientError

from framework.aws.client_factory import aws_client


def _log_group_exists(log_group: str) -> bool:
    try:
        resp = aws_client("logs").describe_log_groups(logGroupNamePrefix=log_group)
    except ClientError:
        return False
    return any(g.get("logGroupName") == log_group for g in resp.get("logGroups", []))


def assert_log_contains(
    log_group: str,
    pattern: str,
    *,
    since_ms: int | None = None,
    timeout_s: float = 10.0,
    poll_interval_s: float = 1.0,
) -> dict[str, Any]:
    """Poll `log_group` until a log event whose message contains `pattern`
    appears. `since_ms` filters to events with `timestamp >= since_ms`
    (epoch milliseconds); defaults to "now minus 60s".

    Returns the matching log event dict.
    """
    if not _log_group_exists(log_group):
        raise AssertionError(f"CloudWatch log group does not exist: {log_group}")

    if since_ms is None:
        since_ms = int((time.time() - 60) * 1000)

    logs = aws_client("logs")
    deadline = time.monotonic() + timeout_s
    seen = 0

    while time.monotonic() < deadline:
        # filter_log_events scans across all streams in a group — exactly what
        # the AWS console "Search log group" feature does.
        kwargs: dict[str, Any] = {
            "logGroupName": log_group,
            "startTime": since_ms,
            "filterPattern": f'"{pattern}"',
            "limit": 50,
        }
        resp = logs.filter_log_events(**kwargs)
        events = resp.get("events") or []
        seen += len(events)
        for evt in events:
            if pattern in (evt.get("message") or ""):
                return evt
        time.sleep(poll_interval_s)

    raise AssertionError(
        f"No CloudWatch log event in {log_group!r} matched {pattern!r} "
        f"within {timeout_s}s (scanned {seen} events)"
    )
