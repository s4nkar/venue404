from typing import Literal

from pydantic import BaseModel


class CreatePaymentRequest(BaseModel):
    booking_id: str
    # "advance" (token, confirms the booking) or "balance" (settles a confirmed
    # booking). Amount is computed server-side from the venue pricing snapshot —
    # never trusted from the client.
    payment_type: Literal["advance", "balance"] = "advance"


class PaymentIntentResponse(BaseModel):
    payment_id: str
    booking_id: str
    client_secret: str | None
    amount_paise: int
    currency: str
    status: str


class PaymentResponse(BaseModel):
    id: str
    booking_id: str
    amount_paise: int
    currency: str
    status: str
    stripe_payment_intent_id: str


class RefundRequest(BaseModel):
    booking_id: str
    reason: str | None = None


class RefundResponse(BaseModel):
    booking_id: str
    refunded_paise: int
    status: str


class OwnerFinancialStatsResponse(BaseModel):
    total_collected_paise: int
    pending_collection_paise: int
