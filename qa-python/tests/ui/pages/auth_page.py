from __future__ import annotations

from playwright.sync_api import Page, expect


class AuthPage:
    """Page object for AuthScreen.tsx — exposes /login and /register routes."""

    LOGIN_PATH = "/login"
    REGISTER_PATH = "/register"

    def __init__(self, page: Page, base_url: str) -> None:
        self.page = page
        self.base_url = base_url.rstrip("/")

    def visit(self, *, mode: str = "login") -> "AuthPage":
        path = self.REGISTER_PATH if mode == "register" else self.LOGIN_PATH
        self.page.goto(f"{self.base_url}{path}")
        expect(self.page.locator("#auth-email")).to_be_visible()
        return self

    def select_register_tab(self) -> "AuthPage":
        self.page.get_by_role("tab", name="Register").click()
        expect(self.page.locator("#auth-age")).to_be_visible()
        return self

    def fill_credentials(self, email: str, password: str) -> "AuthPage":
        self.page.locator("#auth-email").fill(email)
        self.page.locator("#auth-password").fill(password)
        return self

    def confirm_age(self) -> "AuthPage":
        self.page.locator("#auth-age").check()
        return self

    def submit(self) -> "AuthPage":
        self.page.get_by_role("button", name="Create Account").click()
        return self

    def submit_login(self) -> "AuthPage":
        self.page.get_by_role("button", name="Login").click()
        return self

    def error_message(self) -> str | None:
        loc = self.page.get_by_role("alert")
        return loc.text_content() if loc.count() else None
