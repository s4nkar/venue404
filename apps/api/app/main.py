from fastapi import FastAPI
from app.core.middleware import register_middleware
from app.modules.auth.routes import router as auth_router
from app.modules.profile.routes import router as profile_router
from app.modules.venue.routes import router as venue_router
from app.modules.search.routes import router as search_router
from app.modules.booking.routes import router as booking_router
from app.modules.availability.routes import router as availability_router
from app.modules.notification.routes import router as notification_router
from app.modules.admin.routes import router as admin_router
from app.modules.payment.routes import router as payment_router

app = FastAPI(title="Venue404 API")

register_middleware(app)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(profile_router, prefix="/api/profile", tags=["profile"])
app.include_router(venue_router, prefix="/api/venues", tags=["venues"])
app.include_router(search_router, prefix="/api/search", tags=["search"])
app.include_router(booking_router, prefix="/api/bookings", tags=["bookings"])
app.include_router(availability_router, prefix="/api/availability", tags=["availability"])
app.include_router(notification_router, prefix="/api/notifications", tags=["notifications"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(payment_router, prefix="/api/payments", tags=["payments"])
