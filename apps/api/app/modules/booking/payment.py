"""RETIRED.

The advance/balance payment-capture handling that used to live here has been
superseded by the real, race-safe implementation in
``app.modules.payment.service`` (``confirm_payment`` / ``confirm_balance_payment``),
driven by the Stripe webhook in ``app.modules.payment.webhooks``.

This module is intentionally left empty to avoid reintroducing the old
stub-backed path. See docs/modules/payment.md and the R9 plan.
"""
