"""End-to-end game flow: init -> spin -> history -> round detail.

Validates response bodies against the live OpenAPI document and exercises
authoritative state transitions (balance debit, history append).
"""

from __future__ import annotations

import time

import pytest

from framework.api_client import ApiClient
from framework.config import SETTINGS
from framework.schemas import assert_matches


def _init_session(api: ApiClient) -> dict:
    resp = api.post(
        "/api/v1/game/init",
        json_body={
            "game_id": SETTINGS.default_game_id,
            "platform": "web",
            "locale": "en",
            "client_version": "qa-python/0.1",
        },
    ).expect_ok()
    assert_matches("InitResponse", resp.body)
    return resp.body


def _spin_once(
    api: ApiClient,
    session: dict,
    *,
    amount: float = 1.0,
    lines: int | None = None,
) -> dict:
    cfg = session["config"]
    effective_lines = lines if lines is not None else cfg.get("default_lines", cfg["max_lines"])
    resp = api.post(
        "/api/v1/spin",
        json_body={
            "session_id": session["session_id"],
            "game_id": SETTINGS.default_game_id,
            "bet": {"amount": amount, "currency": "USD", "lines": effective_lines},
            "client_timestamp": int(time.time() * 1000),
        },
    ).expect_ok()
    assert_matches("SpinResponse", resp.body)
    return resp.body


@pytest.mark.smoke
@pytest.mark.api
def test_game_init_returns_session_and_config(authed_api: ApiClient) -> None:
    body = _init_session(authed_api)
    assert body["game_id"] == SETTINGS.default_game_id
    assert body["session_id"]
    cfg = body["config"]
    assert cfg["reels"] >= 3 and cfg["rows"] >= 3
    assert cfg["min_bet"] <= cfg["max_bet"]


@pytest.mark.smoke
@pytest.mark.api
def test_spin_debits_wallet_and_returns_outcome(authed_api: ApiClient) -> None:
    session = _init_session(authed_api)
    bet_amount = 1.0

    spin = _spin_once(authed_api, session, amount=bet_amount)

    matrix = spin["outcome"]["reel_matrix"]
    assert matrix and all(isinstance(row, list) and row for row in matrix), "non-empty reel matrix"
    # New users seed at $1000.00 (100000 cents). Worst case: bet debits without payout.
    assert spin["balance"]["amount"] <= 1000.0
    assert spin["balance"]["amount"] >= 0
    assert spin["spin_id"]


@pytest.mark.regression
@pytest.mark.api
def test_history_lists_recent_spins(authed_api: ApiClient) -> None:
    session = _init_session(authed_api)
    spin = _spin_once(authed_api, session)

    resp = authed_api.get("/api/v1/history", params={"limit": 10}).expect_ok()
    assert_matches("EnhancedHistoryResponse", resp.body)
    spin_ids = [item["spin_id"] for item in resp.body["items"]]
    assert spin["spin_id"] in spin_ids


@pytest.mark.regression
@pytest.mark.api
def test_round_detail_matches_spin_response(authed_api: ApiClient) -> None:
    session = _init_session(authed_api)
    spin = _spin_once(authed_api, session)

    resp = authed_api.get(f"/api/v1/history/{spin['spin_id']}").expect_ok()
    assert_matches("RoundDetailResponse", resp.body)
    rnd = resp.body["round"]
    assert rnd["id"] == spin["spin_id"]
    assert rnd["session_id"] == session["session_id"]
    assert rnd["bet"] == pytest.approx(spin["bet"]["amount"])


@pytest.mark.negative
@pytest.mark.api
def test_spin_without_token_is_unauthorized(api: ApiClient) -> None:
    resp = api.post(
        "/api/v1/spin",
        json_body={
            "session_id": "fake",
            "game_id": SETTINGS.default_game_id,
            "bet": {"amount": 1.0, "currency": "USD", "lines": 25},
            "client_timestamp": int(time.time() * 1000),
        },
    )
    assert resp.status == 401
    assert_matches("ErrorResponse", resp.body)


@pytest.mark.negative
@pytest.mark.api
def test_spin_rejects_unknown_session(authed_api: ApiClient) -> None:
    resp = authed_api.post(
        "/api/v1/spin",
        json_body={
            "session_id": "nonexistent-session-id",
            "game_id": SETTINGS.default_game_id,
            "bet": {"amount": 1.0, "currency": "USD", "lines": 25},
            "client_timestamp": int(time.time() * 1000),
        },
    )
    assert resp.status in (400, 403, 404, 422)
    assert_matches("ErrorResponse", resp.body)
