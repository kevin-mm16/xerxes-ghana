"""Authenticated reviewer identities and revocable opaque sessions."""

from alembic import op

revision = "0004_moderator_sessions"
down_revision = "0003_private_media"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE reviewers (
            id uuid PRIMARY KEY,
            username varchar(120) UNIQUE NOT NULL,
            password_hash varchar(512) NOT NULL,
            role varchar(16) NOT NULL CHECK (role IN ('moderator','admin')),
            active boolean NOT NULL DEFAULT true,
            created_at timestamptz NOT NULL DEFAULT now(),
            last_login_at timestamptz,
            CHECK (username = lower(username)),
            CHECK (password_hash LIKE '$argon2%')
        )
    """)
    op.execute("""
        CREATE TABLE reviewer_sessions (
            id uuid PRIMARY KEY,
            reviewer_id uuid NOT NULL REFERENCES reviewers(id) ON DELETE CASCADE,
            token_hash varchar(64) UNIQUE NOT NULL,
            csrf_token varchar(43) NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            expires_at timestamptz NOT NULL,
            revoked_at timestamptz,
            CHECK (expires_at > created_at)
        )
    """)
    op.execute("CREATE INDEX ix_reviewer_sessions_expiry ON reviewer_sessions(expires_at)")
    op.execute("""
        CREATE TABLE auth_login_throttles (
            key varchar(80) PRIMARY KEY,
            failures integer NOT NULL DEFAULT 0 CHECK (failures >= 0),
            window_started_at timestamptz NOT NULL
        )
    """)


def downgrade():
    op.execute("DROP TABLE auth_login_throttles")
    op.execute("DROP TABLE reviewer_sessions")
    op.execute("DROP TABLE reviewers")
