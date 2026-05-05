"""AWS-integrated test helpers.

The framework speaks boto3 against either real AWS or a LocalStack endpoint —
the only difference is the value of `AWS_ENDPOINT_URL`. Tests under
`tests/aws/` are gated behind the `aws` pytest marker so a developer
without a LocalStack/AWS environment can run the rest of the suite with
`pytest -m "not aws"`.
"""

from framework.aws.client_factory import aws_client, aws_resource
from framework.aws.cloudwatch_assertions import assert_log_contains
from framework.aws.s3_assertions import (
    assert_object_exists,
    assert_object_metadata,
    wait_for_object,
)
from framework.aws.sqs_assertions import assert_message_in_queue, drain_queue

__all__ = [
    "aws_client",
    "aws_resource",
    "assert_log_contains",
    "assert_object_exists",
    "assert_object_metadata",
    "wait_for_object",
    "assert_message_in_queue",
    "drain_queue",
]
