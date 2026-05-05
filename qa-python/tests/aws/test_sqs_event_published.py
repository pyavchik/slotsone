"""SQS event publication — proves the framework can verify event-driven
pipelines: producer enqueues, consumer asserts the right shape landed.

Pattern modelled here: an HTTP API publishes a `wallet_credited` event to
SQS for downstream ledger workers; this test asserts the event reached the
queue with the expected payload before the worker can pick it up.
"""

from __future__ import annotations

import json
import uuid

import pytest

from framework.aws.client_factory import aws_client
from framework.aws.sqs_assertions import assert_message_in_queue, drain_queue


@pytest.mark.aws
@pytest.mark.smoke
def test_published_event_lands_with_expected_shape(sqs_queue: str) -> None:
    drain_queue(sqs_queue)

    event_id = str(uuid.uuid4())
    payload = {
        "event_type": "wallet_credited",
        "event_id": event_id,
        "user_id": "user-abc-123",
        "amount_cents": 500,
        "currency": "USD",
    }
    aws_client("sqs").send_message(QueueUrl=sqs_queue, MessageBody=json.dumps(payload))

    matched = assert_message_in_queue(
        sqs_queue,
        predicate=lambda body: isinstance(body, dict)
        and body.get("event_id") == event_id
        and body.get("event_type") == "wallet_credited",
        timeout_s=5,
    )
    body = json.loads(matched["Body"])
    assert body["amount_cents"] == 500
    assert body["currency"] == "USD"


@pytest.mark.aws
@pytest.mark.negative
def test_missing_event_times_out_with_clear_error(sqs_queue: str) -> None:
    drain_queue(sqs_queue)
    with pytest.raises(AssertionError, match="No SQS message matched predicate"):
        assert_message_in_queue(
            sqs_queue,
            predicate=lambda body: isinstance(body, dict) and body.get("never") == True,
            timeout_s=2,
        )
