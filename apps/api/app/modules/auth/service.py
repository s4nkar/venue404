from app.modules.auth.schemas import LoginRequest, RegisterRequest, TokenResponse


def register(body: RegisterRequest) -> TokenResponse:
    raise NotImplementedError


def login(body: LoginRequest) -> TokenResponse:
    raise NotImplementedError
