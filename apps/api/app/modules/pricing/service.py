from math import ceil

from sqlalchemy.orm import Session

from app.modules.pricing.schemas import (
    PricingQuote,
)

from app.modules.venue.service import (
    _get_active_venue_or_404,
)


def compute_pricing_quote(
    venue,
    starts_at,
    ends_at,
) -> PricingQuote:

    duration_minutes = max(
        0,
        int((ends_at - starts_at).total_seconds() / 60),
    )

    if venue.pricing_mode == "flat":

        quoted_price_paise = venue.base_price_paise or 0

    elif venue.pricing_mode == "hourly":

        hours = duration_minutes / 60

        quoted_price_paise = int(ceil(hours * (venue.hourly_rate_paise or 0)))

    else:
        raise ValueError(f"Unsupported pricing mode: {venue.pricing_mode}")

    platform_fee_paise = int(
        quoted_price_paise * float(venue.platform_commission_pct) / 100
    )

    owner_payout_paise = quoted_price_paise - platform_fee_paise

    advance_due_paise = int(quoted_price_paise * float(venue.advance_pct) / 100)

    balance_due_paise = quoted_price_paise - advance_due_paise

    return PricingQuote(
        quoted_price_paise=quoted_price_paise,
        platform_commission_pct=float(venue.platform_commission_pct),
        platform_fee_paise=platform_fee_paise,
        owner_payout_paise=owner_payout_paise,
        advance_pct=float(venue.advance_pct),
        advance_due_paise=advance_due_paise,
        balance_due_paise=balance_due_paise,
        pricing_mode=venue.pricing_mode,
    )


def get_pricing_quote(
    db: Session,
    venue_id,
    starts_at,
    ends_at,
):
    venue = _get_active_venue_or_404(
        db,
        venue_id,
    )

    return compute_pricing_quote(
        venue=venue,
        starts_at=starts_at,
        ends_at=ends_at,
    )
