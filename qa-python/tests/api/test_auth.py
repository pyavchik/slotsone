"""Auth flow: register, login, token shape, negative paths."""

from __future__ import annotations

import pytest

from framework.api_client import ApiClient
from framework.data_factory import Credentials, new_credentials
from framework.schemas import assert_matches


@pytest.mark.smoke
@pytest.mark.api
def test_register_returns_bearer_token_matching_schema(
    api: ApiClient, credentials: Credentials
) -> None:
    resp = api.post(
        "/api/v1/auth/register",
        json_body={"email": credentials.email, "password": credentials.password},
    ).expect_ok(allowed=(201,))

    assert_matches("AuthResponse", resp.body)
    assert resp.body["token_type"] == "Bearer"
    assert resp.body["access_token"].count(".") == 2  # JWT header.payload.signature


@pytest.mark.regression
@pytest.mark.api
def test_login_returns_new_token_for_existing_user(
    api: ApiClient, credentials: Credentials
) -> None:
    api.post(
        "/api/v1/auth/register",
        json_body={"email": credentials.email, "password": credentials.password},
    ).expect_ok(allowed=(201,))

    resp = api.post(
        "/api/v1/auth/login",
        json_body={"email": credentials.email, "password": credentials.password},
    ).expect_ok()
    assert_matches("AuthResponse", resp.body)


@pytest.mark.negative
@pytest.mark.api
def test_register_rejects_short_password(api: ApiClient) -> None:
    resp = api.post(
        "/api/v1/auth/register",
        json_body={"email": new_credentials().email, "password": "short"},
    )
    assert resp.status == 400
    assert_matches("ErrorResponse", resp.body)


@pytest.mark.negative
@pytest.mark.api
def test_register_rejects_invalid_email(api: ApiClient) -> None:
    resp = api.post(
        "/api/v1/auth/register",
        json_body={"email": "not-an-email", "password": "longenoughpassword"},
    )
    assert resp.status == 400
    assert_matches("ErrorResponse", resp.body)


@pytest.mark.negative
@pytest.mark.api
def test_login_rejects_wrong_password(api: ApiClient, credentials: Credentials) -> None:
    api.post(
        "/api/v1/auth/register",
        json_body={"email": credentials.email, "password": credentials.password},
    ).expect_ok(allowed=(201,))

    resp = api.post(
        "/api/v1/auth/login",
        json_body={"email": credentials.email, "password": "wrong-password-12345"},
    )
    assert resp.status == 401
    assert_matches("ErrorResponse", resp.body)


@pytest.mark.negative
@pytest.mark.api
def test_register_duplicate_email_is_conflict(api: ApiClient, credentials: Credentials) -> None:
    payload = {"email": credentials.email, "password": credentials.password}
    api.post("/api/v1/auth/register", json_body=payload).expect_ok(allowed=(201,))
    resp = api.post("/api/v1/auth/register", json_body=payload)
    assert resp.status in (400, 409)
    assert_matches("ErrorResponse", resp.body)
