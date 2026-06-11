"""Notification copy + email HTML, keyed by event type.

render_notification(type, context, booking_id) -> (title, body, html)
`context` keys are best-effort; missing keys degrade gracefully.
"""
from app.core.config import settings

# type -> (title, body template). Body templates use str.format(**context).
_TEMPLATES: dict[str, tuple[str, str]] = {
    "request_received": (
        "Booking request received",
        "We received your request for {venue_name}. The owner will respond soon.",
    ),
    "new_request_owner": (
        "New booking request",
        "You have a new booking request for {venue_name}.",
    ),
    "request_accepted": (
        "Your booking was accepted",
        "Pay the token advance within 24 hours to confirm your booking for {venue_name}.",
    ),
    "payment_reminder": (
        "Reminder: complete your payment",
        "Your 24-hour hold for {venue_name} is expiring soon. Pay the token advance to confirm.",
    ),
    "payment_confirmed": (
        "Booking confirmed",
        "Your booking for {venue_name} is confirmed. We look forward to your event!",
    ),
    "hold_expired": (
        "Payment hold expired",
        "Your 24-hour hold for {venue_name} has expired and the slot was released.",
    ),
    "conflict_canceled": (
        "Booking unavailable",
        "Another guest confirmed {venue_name} first. Any payment you made has been refunded.",
    ),
    "booking_canceled": (
        "Booking canceled",
        "Your booking for {venue_name} was canceled.",
    ),
    "refund_issued": (
        "Refund issued",
        "A refund of ₹{amount_rupees} has been issued for {venue_name}.",
    ),
    "booking_completed": (
        "Booking completed",
        "Your event at {venue_name} is marked complete. Thanks for using Venue404!",
    ),
}


def render_notification(
    type: str, context: dict | None = None, booking_id=None
) -> tuple[str, str, str]:
    context = {"venue_name": "your venue", **(context or {})}
    title, body_tmpl = _TEMPLATES.get(type, ("Notification", "You have a new notification."))
    try:
        body = body_tmpl.format(**context)
    except (KeyError, IndexError):
        body = body_tmpl  # leave placeholders rather than crash

    link = ""
    if booking_id is not None:
        url = f"{settings.frontend_base_url}/bookings/{booking_id}"
        link = f'<p><a href="{url}">View booking</a></p>'
    html = f"<h2>{title}</h2><p>{body}</p>{link}"
    return title, body, html
