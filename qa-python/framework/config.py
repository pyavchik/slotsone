from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env", override=False)


@dataclass(frozen=True)
class Settings:
    api_base_url: str
    ui_base_url: str
    default_game_id: str
    request_timeout_s: float
    smoke_response_budget_ms: int

    @classmethod
    def from_env(cls) -> "Settings":
        api = os.getenv("API_BASE_URL", "http://localhost:3001").rstrip("/")
        ui = os.getenv("UI_BASE_URL", "http://localhost:5173").rstrip("/")
        return cls(
            api_base_url=api,
            ui_base_url=ui,
            default_game_id=os.getenv("DEFAULT_GAME_ID", "slot_mega_fortune_001"),
            request_timeout_s=float(os.getenv("REQUEST_TIMEOUT_S", "10")),
            smoke_response_budget_ms=int(os.getenv("SMOKE_RESPONSE_BUDGET_MS", "1500")),
        )


SETTINGS = Settings.from_env()
