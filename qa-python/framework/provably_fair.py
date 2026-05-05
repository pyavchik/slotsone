"""Provably-fair verification helpers.

Mirrors the backend's seed-derivation logic so tests can independently
re-derive the RNG seed used for a round and confirm the published
`server_seed_hash` matches the revealed `server_seed` after rotation.
"""

from __future__ import annotations

import hashlib
import hmac


def sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def derive_round_seed(server_seed: str, client_seed: str, nonce: int) -> int:
    """Backend uses HMAC-SHA256(server_seed, "<client_seed>:<nonce>") and takes
    the first 4 bytes as a uint32 RNG seed. Replicated here for verification."""
    msg = f"{client_seed}:{nonce}".encode("utf-8")
    digest = hmac.new(server_seed.encode("utf-8"), msg, hashlib.sha256).digest()
    return int.from_bytes(digest[:4], byteorder="big", signed=False)


def server_seed_matches_hash(revealed_server_seed: str, published_hash: str) -> bool:
    return sha256_hex(revealed_server_seed).lower() == published_hash.lower()
