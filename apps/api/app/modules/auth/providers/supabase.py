from uuid import UUID
from jose import jwt, JWTError
from app.core.config import settings
from app.core.exceptions import UnauthorizedError
from app.modules.auth.providers.base import AuthProvider, ProviderUser


class SupabaseAuthProvider(AuthProvider):
    async def verify_token(self, token: str) -> ProviderUser:
        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except JWTError:
            raise UnauthorizedError("Invalid or expired token")

        sub = payload.get("sub")
        if not sub:
            raise UnauthorizedError("Token missing subject claim")

        return ProviderUser(
            id=UUID(sub),
            email=payload.get("email"),
        )
