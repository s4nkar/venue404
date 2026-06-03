import json
import urllib.request
from uuid import UUID

from jose import jwt, JWTError

from app.core.config import settings
from app.core.exceptions import UnauthorizedError
from app.modules.auth.providers.base import AuthProvider, ProviderUser


class SupabaseAuthProvider(AuthProvider):
    def __init__(self) -> None:
        self._jwks_cache: list | None = None

    def _get_jwks(self) -> list:
        if self._jwks_cache is None:
            url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
            with urllib.request.urlopen(url, timeout=5) as resp:  # noqa: S310
                self._jwks_cache = json.loads(resp.read()).get("keys", [])
        return self._jwks_cache

    def verify_token(self, token: str) -> ProviderUser:
        try:
            header = jwt.get_unverified_header(token)
            alg = header.get("alg", "HS256")

            if alg == "HS256":
                payload = jwt.decode(
                    token,
                    settings.supabase_jwt_secret,
                    algorithms=["HS256"],
                    audience="authenticated",
                )
            else:
                # RS256 or other asymmetric alg — verify via Supabase JWKS
                kid = header.get("kid")
                keys = self._get_jwks()
                key = next((k for k in keys if k.get("kid") == kid), None) or (keys[0] if keys else None)
                if key is None:
                    raise UnauthorizedError("No matching JWKS key found")
                payload = jwt.decode(
                    token,
                    key,
                    algorithms=[alg],
                    audience="authenticated",
                )
        except JWTError as exc:
            raise UnauthorizedError(f"JWT error: {exc}")

        sub = payload.get("sub")
        if not sub:
            raise UnauthorizedError("Token missing subject claim")

        return ProviderUser(id=UUID(sub), email=payload.get("email"))
