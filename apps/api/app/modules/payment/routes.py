from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, AuthContext
from app.modules.payment.schemas import (
    CreatePaymentRequest, PaymentIntentResponse, PaymentResponse,
    RefundRequest, RefundResponse,
)
from app.modules.payment import service, webhooks

router = APIRouter()


@router.post("/", response_model=PaymentIntentResponse, status_code=201)
def create_payment(
    body: CreatePaymentRequest,
    user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Stripe PaymentIntent for a booking's token advance or balance."""
    return service.create_payment_intent(db, user.user_id, body.booking_id, body.payment_type)


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Stripe calls this — no auth dependency; verified by signature instead."""
    return await webhooks.handle(request)


@router.post("/refund", response_model=RefundResponse)
def refund(
    body: RefundRequest,
    user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Owner/admin full refund of a booking's captured payment."""
    return service.refund_booking(db, body.booking_id, user, body.reason)


@router.get("/{booking_id}", response_model=list[PaymentResponse])
def get_payments(
    booking_id: str,
    user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_payments_for_booking(db, booking_id, user)
