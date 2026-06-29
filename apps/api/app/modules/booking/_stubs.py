import logging

logger = logging.getLogger(__name__)


def create_advance_payment_intent(booking) -> str:
    logger.info("[STUB] create advance payment intent booking=%s", booking.id)
    return f"pi_advance_stub_{booking.id}"


def cancel_payment_intent(payment_intent_id: str | None) -> None:
    if payment_intent_id:
        logger.info("[STUB] cancel payment intent %s", payment_intent_id)


def initiate_refund(booking, amount_paise: int) -> None:
    logger.info("[STUB] refund %s paise booking=%s", amount_paise, booking.id)
