from __future__ import annotations

import pytest
from playwright.sync_api import Page

from framework.config import SETTINGS


@pytest.fixture(scope="session")
def base_url() -> str:
    return SETTINGS.ui_base_url


@pytest.fixture(autouse=True)
def _set_default_viewport(page: Page) -> None:
    page.set_viewport_size({"width": 1280, "height": 800})
    page.set_default_timeout(10_000)
