from app.modules.payment.schemas import PaymentResponse, CreatePaymentRequest


def create_payment(user_id: str, body: CreatePaymentRequest) -> PaymentResponse:
    raise NotImplementedError
