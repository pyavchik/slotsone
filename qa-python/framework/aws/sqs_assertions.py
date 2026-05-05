"""SQS message assertions for event-driven flow tests."""

from __future__ import annotations

import json
import time
from typing import Any, Callable

from framework.aws.client_factory import aws_client


def _receive_batch(queue_url: str, *, max_messages: int = 10, wait_s: int = 1) -> list[dict[str, Any]]:
    resp = aws_client("sqs").receive_message(
        QueueUrl=queue_url,
        MaxNumberOfMessages=max_messages,
        WaitTimeSeconds=wait_s,
        MessageAttributeNames=["All"],
        AttributeNames=["All"],
    )
    return resp.get("Messages") or []


def _try_parse_body(body: str) -> Any:
    try:
        return json.loads(body)
    except (TypeError, ValueError):
        return body


def assert_message_in_queue(
    queue_url: str,
    *,
    predicate: Callable[[Any], bool] = lambda _msg: True,
    timeout_s: float = 10.0,
    delete_on_match: bool = True,
) -> dict[str, Any]:
    """Poll `queue_url` until a message satisfying `predicate` arrives.

    `predicate` is called with the parsed body (JSON if parseable, else the raw
    string). Returns the matching SQS message dict. Drains and re-queues
    non-matching messages by changing visibility, but leaves them in the queue.
    """
    sqs = aws_client("sqs")
    deadline = time.monotonic() + timeout_s
    seen_ids: set[str] = set()

    while time.monotonic() < deadline:
        for msg in _receive_batch(queue_url):
            msg_id = msg.get("MessageId", "")
            body = _try_parse_body(msg.get("Body", ""))
            if predicate(body):
                if delete_on_match:
                    sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=msg["ReceiptHandle"])
                return msg
            seen_ids.add(msg_id)
        time.sleep(0.2)

    raise AssertionError(
        f"No SQS message matched predicate within {timeout_s}s on {queue_url} "
        f"(saw {len(seen_ids)} non-matching messages)"
    )


def drain_queue(queue_url: str, *, max_iterations: int = 20) -> int:
    """Receive-and-delete all messages currently visible. Used in test setup
    to ensure a clean queue between scenarios. Returns the count drained."""
    sqs = aws_client("sqs")
    drained = 0
    for _ in range(max_iterations):
        batch = _receive_batch(queue_url, wait_s=0)
        if not batch:
            break
        for msg in batch:
            sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=msg["ReceiptHandle"])
            drained += 1
    return drained
