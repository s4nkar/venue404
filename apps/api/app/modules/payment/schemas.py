from pydantic import BaseModel


class CreatePaymentRequest(BaseModel):
    booking_id: str
    # Amount is computed server-side from the venue pricing snapshot — never
    # trusted from the client.


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
