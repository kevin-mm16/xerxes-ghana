"""Versioned reference geography, separate from monitoring eligibility."""

from alembic import op

revision = "0002_administrative_boundaries"
down_revision = "0001_geospatial"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE boundary_datasets (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            version varchar(100) UNIQUE NOT NULL,
            source_name varchar(160) NOT NULL,
            source_url text NOT NULL,
            download_url text NOT NULL,
            source_date date NOT NULL,
            census_year integer NOT NULL CHECK (census_year BETWEEN 1900 AND 2100),
            archive_sha256 varchar(64) NOT NULL CHECK (archive_sha256 ~ '^[0-9a-f]{64}$'),
            license_note text NOT NULL,
            imported_at timestamptz NOT NULL DEFAULT now()
        )
    """)
    op.execute("""
        CREATE TABLE administrative_boundaries (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            dataset_id uuid NOT NULL REFERENCES boundary_datasets(id) ON DELETE CASCADE,
            source_code varchar(180) NOT NULL,
            name varchar(160) NOT NULL,
            region varchar(160) NOT NULL,
            level varchar(32) NOT NULL CHECK (level = 'district'),
            geometry geometry(MultiPolygon,4326) NOT NULL
                CHECK (ST_IsValid(geometry) AND NOT ST_IsEmpty(geometry))
                CHECK (ST_XMin(Box2D(geometry)) >= -3.6 AND ST_XMax(Box2D(geometry)) <= 1.6
                    AND ST_YMin(Box2D(geometry)) >= 4.1 AND ST_YMax(Box2D(geometry)) <= 11.5),
            geometry_repaired boolean NOT NULL DEFAULT false,
            UNIQUE (dataset_id, source_code)
        )
    """)
    op.execute(
        "CREATE INDEX ix_administrative_geometry ON administrative_boundaries USING gist(geometry)"
    )
    op.execute("CREATE INDEX ix_administrative_dataset ON administrative_boundaries(dataset_id)")


def downgrade():
    op.execute("DROP TABLE administrative_boundaries")
    op.execute("DROP TABLE boundary_datasets")
