"""Bugs and Balance payment refactor

Revision ID: f151b068541c
Revises: ec2964b424ff
Create Date: 2026-06-20 15:43:04.303811

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'f151b068541c'
down_revision: Union[str, None] = 'ec2964b424ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Distinguish advance vs balance captures on the payments read-model.
    #    server_default keeps the NOT NULL add safe on a populated table.
    op.add_column(
        'payments',
        sa.Column('payment_type', sa.String(), nullable=False, server_default='advance'),
    )

    # 2. Keep the booking_status_history transition CHECK in sync with the app
    #    state machine: acceptance no longer reserves the slot, so a competing
    #    owner_accepted booking is conflict-cancelled when another requester pays
    #    first. Add owner_accepted -> conflict_cancelled (the rest is unchanged).
    op.drop_constraint('ck_booking_status_history_transition', 'booking_status_history', type_='check')
    op.create_check_constraint(
        'ck_booking_status_history_transition',
        'booking_status_history',
        "old_status IS NULL OR "
        "old_status = new_status OR "
        "(old_status = 'requested' AND new_status IN ('owner_accepted', 'owner_rejected', 'request_expired', 'conflict_cancelled', 'admin_cancelled')) OR "
        "(old_status = 'owner_accepted' AND new_status IN ('confirmed', 'hold_expired', 'user_cancelled', 'admin_cancelled', 'conflict_cancelled')) OR "
        "(old_status = 'confirmed' AND new_status IN ('completed', 'user_cancelled', 'admin_cancelled', 'balance_overdue_cancelled'))",
    )


def downgrade() -> None:
    op.drop_constraint('ck_booking_status_history_transition', 'booking_status_history', type_='check')
    op.create_check_constraint(
        'ck_booking_status_history_transition',
        'booking_status_history',
        "old_status IS NULL OR "
        "old_status = new_status OR "
        "(old_status = 'requested' AND new_status IN ('owner_accepted', 'owner_rejected', 'request_expired', 'conflict_cancelled', 'admin_cancelled')) OR "
        "(old_status = 'owner_accepted' AND new_status IN ('confirmed', 'hold_expired', 'user_cancelled', 'admin_cancelled')) OR "
        "(old_status = 'confirmed' AND new_status IN ('completed', 'user_cancelled', 'admin_cancelled', 'balance_overdue_cancelled'))",
    )
    op.drop_column('payments', 'payment_type')
