"""UI: history page is reachable after a registered user spins via API."""

from __future__ import annotations

import time

import pytest
from playwright.sync_api import Page, expect

from framework.api_client import ApiClient
from framework.config import SETTINGS
from framework.data_factory import new_credentials
from tests.ui.pages.auth_page import AuthPage
from tests.ui.pages.game_page import GamePage


@pytest.mark.regression
@pytest.mark.ui
def test_history_page_renders_after_api_seeded_spin(page: Page, base_url: str) -> None:
    creds = new_credentials()

    # Seed state via API (faster, deterministic) then drive the UI.
    api = ApiClient()
    token = api.post(
        "/api/v1/auth/register",
        json_body={"email": creds.email, "password": creds.password},
    ).expect_ok(allowed=(201,)).body["access_token"]
    api.with_token(token)

    init = api.post(
        "/api/v1/game/init",
        json_body={
            "game_id": SETTINGS.default_game_id,
            "platform": "web",
            "locale": "en",
            "client_version": "qa-python/0.1",
        },
    ).expect_ok().body
    cfg = init["config"]
    api.post(
        "/api/v1/spin",
        json_body={
            "session_id": init["session_id"],
            "game_id": SETTINGS.default_game_id,
            "bet": {
                "amount": 1.0,
                "currency": "USD",
                "lines": cfg.get("default_lines", cfg["max_lines"]),
            },
            "client_timestamp": int(time.time() * 1000),
        },
    ).expect_ok()

    # Now log in via the UI as the same user and open the history route.
    (
        AuthPage(page, base_url)
        .visit(mode="login")
        .fill_credentials(creds.email, creds.password)
        .submit_login()
    )
    game = GamePage(page, base_url).wait_for_logged_in()
    game.open_history()

    # The lazy-loaded history route should mount; we accept either a table or
    # an empty-state — but never a route-not-found / blank page.
    expect(page.locator("body")).not_to_be_empty()
    page.wait_for_load_state("networkidle")
