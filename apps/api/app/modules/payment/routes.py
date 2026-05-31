from fastapi import APIRouter, Depends, Request
from app.modules.payment.schemas import PaymentResponse, CreatePaymentRequest
from app.modules.auth.dependencies import get_current_user
from app.modules.payment import service, webhooks

router = APIRouter()


@router.post("/", response_model=PaymentResponse, status_code=201)
def create_payment(body: CreatePaymentRequest, user=Depends(get_current_user)):
    return service.create_payment(user["sub"], body)


@router.post("/webhook")
async def stripe_webhook(request: Request):
    return await webhooks.handle(request)
