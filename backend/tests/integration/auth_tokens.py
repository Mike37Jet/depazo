import time
from typing import Any
from uuid import UUID

import jwt
from cryptography.hazmat.primitives.asymmetric import ec

SUPABASE_URL = "https://depazo-test.supabase.co"
ISSUER = f"{SUPABASE_URL}/auth/v1"
JWKS_URL = f"{ISSUER}/.well-known/jwks.json"
AUDIENCE = "authenticated"
KEY_ID = "test-key-1"

SIGNING_KEY = ec.generate_private_key(ec.SECP256R1())


def public_jwks(key_id: str = KEY_ID) -> dict[str, Any]:
    public_jwk = jwt.algorithms.ECAlgorithm.to_jwk(SIGNING_KEY.public_key(), as_dict=True)
    return {"keys": [{**public_jwk, "kid": key_id, "alg": "ES256", "use": "sig"}]}


def issue_token(
    user_id: UUID, key_id: str = KEY_ID, claim_overrides: dict[str, Any] | None = None
) -> str:
    now = int(time.time())
    claims = {
        "sub": str(user_id),
        "aud": AUDIENCE,
        "iss": ISSUER,
        "iat": now,
        "exp": now + 3600,
        "role": "authenticated",
        **(claim_overrides or {}),
    }
    claims = {name: value for name, value in claims.items() if value is not None}
    return jwt.encode(claims, SIGNING_KEY, algorithm="ES256", headers={"kid": key_id})
