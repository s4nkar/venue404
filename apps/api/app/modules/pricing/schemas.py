from pydantic import BaseModel


class PricingQuote(BaseModel):
    quoted_price_paise: int

    platform_commission_pct: float
    platform_fee_paise: int

    owner_payout_paise: int

    advance_pct: float
    advance_due_paise: int
    balance_due_paise: int

    pricing_mode: str


class PricingDisplay(BaseModel):
    total_amount: float
    advance_amount: float
    balance_amount: float

    platform_fee: float
    owner_payout: float

    currency: str = "INR"
