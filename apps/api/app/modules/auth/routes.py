from fastapi import APIRouter, Depends
from app.modules.auth.dependencies import get_current_user, AuthContext
from app.modules.auth.schemas import AuthMeResponse
from app.modules.auth import service

router = APIRouter()


@router.get("/me", response_model=AuthMeResponse)
def me(current_user: AuthContext = Depends(get_current_user)):
    return service.get_me(current_user)
