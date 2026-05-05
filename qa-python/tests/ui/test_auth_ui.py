"""UI smoke: registration flow drives the user past the auth screen."""

from __future__ import annotations

import pytest
from playwright.sync_api import Page

from framework.data_factory import new_credentials
from tests.ui.pages.auth_page import AuthPage
from tests.ui.pages.game_page import GamePage


@pytest.mark.smoke
@pytest.mark.ui
def test_register_new_user_lands_in_game_shell(page: Page, base_url: str) -> None:
    creds = new_credentials()
    auth = AuthPage(page, base_url).visit(mode="register")
    auth.fill_credentials(creds.email, creds.password).confirm_age().submit()
    GamePage(page, base_url).wait_for_logged_in()


@pytest.mark.regression
@pytest.mark.ui
def test_login_with_wrong_password_shows_error(page: Page, base_url: str) -> None:
    auth = AuthPage(page, base_url).visit()
    auth.fill_credentials("nobody@example.com", "obviously-wrong-password").submit_login()
    page.wait_for_timeout(500)
    err = auth.error_message()
    assert err and err.strip(), "expected an inline error on bad credentials"
