"""RETIRED.

These stub-backed, never-registered job implementations have been replaced by
the wired jobs in the ``app.jobs`` package, which use the real notification
service and the real payment refund path:

  * hold expiry            -> app.jobs.hold_expiry
  * request expiry         -> app.jobs.stale_requests
  * payment reminders      -> app.jobs.payment_reminders
  * booking completion     -> app.jobs.booking_completion
  * balance-overdue flag   -> app.jobs.balance_overdue.run_flag
  * balance-overdue cancel -> app.jobs.balance_overdue.run_autocancel

All jobs are registered in app.jobs.scheduler. This module is intentionally
left empty to avoid reintroducing the old stub path.
"""
