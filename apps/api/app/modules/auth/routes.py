from fastapi import APIRouter, Depends
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.schemas import AuthMeResponse
from app.modules.auth import service

router = APIRouter()


@router.get("/me", response_model=AuthMeResponse)
async def me(current_user=Depends(get_current_user)):
    return await service.get_me(current_user)
