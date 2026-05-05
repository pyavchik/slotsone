from __future__ import annotations

from playwright.sync_api import Page, expect


class GamePage:
    """Slim page object for the post-login game shell (App.tsx)."""

    def __init__(self, page: Page, base_url: str) -> None:
        self.page = page
        self.base_url = base_url.rstrip("/")

    def wait_for_logged_in(self) -> "GamePage":
        # After a successful auth submission the AuthScreen unmounts and the
        # main shell renders. The reliable signal is that the email input
        # disappears.
        expect(self.page.locator("#auth-email")).to_have_count(0)
        return self

    def open_history(self) -> "GamePage":
        self.page.goto(f"{self.base_url}/history")
        return self
