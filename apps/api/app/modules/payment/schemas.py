from pydantic import BaseModel


class CreatePaymentRequest(BaseModel):
    booking_id: str
    amount: float


class PaymentResponse(BaseModel):
    id: str
    booking_id: str
    amount: float
    status: str
    stripe_payment_intent_id: str
