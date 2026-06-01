from fastapi import APIRouter
from app.modules.auth.schemas import LoginRequest, TokenResponse, RegisterRequest
from app.modules.auth import service

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest):
    return service.register(body)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    return service.login(body)
