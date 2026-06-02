from app.modules.auth.schemas import AuthMeResponse, ProfileResponse


async def get_me(current_user) -> AuthMeResponse:
    return AuthMeResponse(
        id=current_user.user_id,
        email=current_user.email,
        profile=ProfileResponse(
            full_name=current_user.full_name,
            phone=current_user.phone,
            avatar_url=current_user.avatar_url,
            status=current_user.status,
        ),
        roles=current_user.roles,
    )
