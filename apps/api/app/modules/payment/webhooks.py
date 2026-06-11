"""Stripe webhook entrypoint.

Flow: verify signature -> record the event in stripe_events (idempotency guard,
duplicate = no-op) -> dispatch -> stamp processed_at / processing_error.
"""
import json
import logging
from datetime import datetime, timezone

from fastapi import Request, HTTPException
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.stripe_client import get_stripe
from app.modules.payment.models import StripeEvent
from app.modules.payment import service

logger = logging.getLogger(__name__)


async def handle(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    stripe = get_stripe()

    if settings.stripe_webhook_secret:
        try:
            event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
        except Exception as e:  # signature / parse failure
            logger.warning("Invalid Stripe webhook: %s", e)
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # dev fallback when no signing secret is configured
        logger.warning("STRIPE_WEBHOOK_SECRET unset — skipping signature verification")
        event = json.loads(payload)

    event_id = event["id"]
    event_type = event["type"]

    db = SessionLocal()
    try:
        # Idempotency guard: PK is the Stripe event id. A replay collides and no-ops.
        db.add(StripeEvent(id=event_id, type=event_type, raw_payload=_json_safe(event)))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            logger.info("Duplicate Stripe event %s ignored", event_id)
            return {"status": "duplicate"}

        try:
            _dispatch(db, event)
            stored = db.get(StripeEvent, event_id)
            stored.processed_at = datetime.now(timezone.utc)
            db.commit()
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            stored = db.get(StripeEvent, event_id)
            if stored:
                stored.processing_error = str(e)
                db.commit()
            logger.exception("Error processing Stripe event %s", event_id)
            raise HTTPException(status_code=500, detail="Processing error")

        return {"status": "ok"}
    finally:
        db.close()


def _dispatch(db, event) -> None:
    event_type = event["type"]
    obj = event["data"]["object"]
    if event_type == "payment_intent.succeeded":
        service.confirm_payment(db, obj["id"])
    elif event_type == "payment_intent.payment_failed":
        service.fail_payment(db, obj["id"])
    else:
        logger.info("Unhandled Stripe event type %s", event_type)


def _json_safe(event) -> dict | None:
    try:
        return json.loads(json.dumps(event, default=str))
    except (TypeError, ValueError):
        return None
