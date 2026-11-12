"""Keep reviewer notes private and separate from generic audit metadata."""

from alembic import op

revision = "0007_private_decision_notes"
down_revision = "0006_public_media"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE moderation_audit_events ADD COLUMN private_note varchar(1000) NOT NULL DEFAULT ''"
    )


def downgrade():
    op.execute("ALTER TABLE moderation_audit_events DROP COLUMN private_note")
