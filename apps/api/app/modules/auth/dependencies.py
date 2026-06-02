from fastapi import Depends, Header
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedError


def get_current_user(authorization: str = Header(...)):
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise UnauthorizedError("Invalid authentication scheme")
        return decode_token(token)
    except Exception as e:
        raise UnauthorizedError(f"Authentication failed: {e}")


def require_role(*roles: str):
    def dependency(user=Depends(get_current_user)):
        if user.get("role") not in roles:
            raise UnauthorizedError("Insufficient permissions")
        return user
    return dependency
