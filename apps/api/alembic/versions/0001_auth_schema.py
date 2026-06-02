"""auth schema - profiles, user_roles, admin_actions

Revision ID: 0001
Revises:
Create Date: 2026-06-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # enums
    profile_status = sa.Enum("active", "suspended", name="profile_status")
    user_role = sa.Enum("customer", "venue_owner", "super_admin", name="user_role")
    profile_status.create(op.get_bind(), checkfirst=True)
    user_role.create(op.get_bind(), checkfirst=True)

    # profiles — id mirrors auth.users.id (Supabase manages auth.users)
    op.create_table(
        "profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String, nullable=True),
        sa.Column("phone", sa.String, nullable=True),
        sa.Column("avatar_url", sa.String, nullable=True),
        sa.Column(
            "status",
            sa.Enum("active", "suspended", name="profile_status", create_type=False),
            nullable=False,
            server_default="active",
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["id"],
            ["auth.users.id"],
            name="fk_profiles_auth_users",
            ondelete="CASCADE",
        ),
    )

    # user_roles
    op.create_table(
        "user_roles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "role",
            sa.Enum("customer", "venue_owner", "super_admin", name="user_role", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["profiles.id"],
            name="fk_user_roles_profile",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("user_id", "role", name="uq_user_roles_user_role"),
    )

    # admin_actions — append-only audit log
    op.create_table(
        "admin_actions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("admin_id", UUID(as_uuid=True), nullable=False),
        sa.Column("action_type", sa.String, nullable=False),
        sa.Column("target_type", sa.String, nullable=False),
        sa.Column("target_id", UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("metadata", sa.JSON, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["admin_id"],
            ["profiles.id"],
            name="fk_admin_actions_profile",
            ondelete="RESTRICT",
        ),
    )


def downgrade() -> None:
    op.drop_table("admin_actions")
    op.drop_table("user_roles")
    op.drop_table("profiles")
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="profile_status").drop(op.get_bind(), checkfirst=True)
