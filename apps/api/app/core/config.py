from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    supabase_url: str
    supabase_jwt_secret: str
    supabase_service_role_key: str
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_currency: str = "inr"

    # Email — Resend is primary, SMTP is the fallback transport
    resend_api_key: str = ""
    email_from: str = "Venue404 <no-reply@venue404.app>"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # Used to build deep links inside notification emails
    frontend_base_url: str = "http://localhost:5173"

    # Booking economics (percent of venue price)
    token_advance_pct: int = 20
    platform_fee_pct: int = 5

    # Only the process that owns scheduling should flip this on
    enable_jobs: bool = False

    super_admin_email: str = ""
    super_admin_password: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
