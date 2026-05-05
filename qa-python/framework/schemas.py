"""Resolve and validate against the live backend OpenAPI document.

The backend ships `backend/openapi.json` — we treat it as the contract of record
and validate response bodies in tests with `jsonschema`. This catches drift
between the implementation and the published contract before the frontend does.
"""

from __future__ import annotations

import copy
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, RefResolver

REPO_ROOT = Path(__file__).resolve().parents[2]
OPENAPI_PATH = REPO_ROOT / "backend" / "openapi.json"


def _normalize_nullable(node: Any) -> Any:
    """Translate OpenAPI 3.0 `nullable: true` into JSON Schema's
    `type: [..., "null"]`. Walks the tree in-place.

    Required because the backend ships an OpenAPI 3.0.3 doc but we validate
    with `Draft202012Validator`, which does not recognise the `nullable`
    keyword.
    """
    if isinstance(node, dict):
        if node.pop("nullable", False):
            t = node.get("type")
            if isinstance(t, str):
                node["type"] = [t, "null"]
            elif isinstance(t, list) and "null" not in t:
                node["type"] = [*t, "null"]
            # If no `type` is set, removing `nullable` is enough — an
            # otherwise-empty schema accepts any value (including null).
        for v in node.values():
            _normalize_nullable(v)
    elif isinstance(node, list):
        for v in node:
            _normalize_nullable(v)
    return node


@lru_cache(maxsize=1)
def _spec() -> dict[str, Any]:
    if not OPENAPI_PATH.exists():
        raise FileNotFoundError(
            f"OpenAPI doc missing at {OPENAPI_PATH}. "
            "Run `cd backend && npm run openapi:generate` first."
        )
    with OPENAPI_PATH.open(encoding="utf-8") as fh:
        raw = json.load(fh)
    return _normalize_nullable(copy.deepcopy(raw))


@lru_cache(maxsize=64)
def validator_for(component_name: str) -> Draft202012Validator:
    spec = _spec()
    schema = spec["components"]["schemas"][component_name]
    resolver = RefResolver.from_schema(spec)
    return Draft202012Validator(schema, resolver=resolver)


def assert_matches(component_name: str, payload: Any) -> None:
    """Validate `payload` against `components.schemas[<component_name>]`.

    Raises AssertionError with a flat list of violations on mismatch.
    """
    errors = sorted(validator_for(component_name).iter_errors(payload), key=lambda e: list(e.path))
    if not errors:
        return
    formatted = "\n".join(f"  - {'/'.join(map(str, e.path)) or '<root>'}: {e.message}" for e in errors)
    raise AssertionError(f"Payload does not match schema {component_name}:\n{formatted}")
