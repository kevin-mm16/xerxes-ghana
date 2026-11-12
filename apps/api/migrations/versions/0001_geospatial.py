"""Coverage and private/public observation storage; immutable initial schema."""

from alembic import op

revision = "0001_geospatial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("""
        CREATE TABLE coverage_regions (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            code varchar(40) UNIQUE NOT NULL CHECK (code ~ '^GHA-XER-[A-Z][0-9]{3}$'),
            name varchar(160) NOT NULL,
            description text NOT NULL,
            geometry geometry(MultiPolygon,4326) NOT NULL
                CHECK (ST_IsValid(geometry) AND NOT ST_IsEmpty(geometry))
                CHECK (ST_XMin(Box2D(geometry)) >= -180 AND ST_XMax(Box2D(geometry)) <= 180
                    AND ST_YMin(Box2D(geometry)) >= -90 AND ST_YMax(Box2D(geometry)) <= 90),
            status varchar(16) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','paused','retired')),
            version integer NOT NULL DEFAULT 1 CHECK (version > 0),
            is_demo boolean NOT NULL DEFAULT false,
            valid_from timestamptz NOT NULL,
            valid_to timestamptz CHECK (valid_to > valid_from),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_coverage_geometry ON coverage_regions USING gist(geometry)")
    op.execute(
        "CREATE INDEX ix_coverage_validity ON coverage_regions(status, valid_from, valid_to)"
    )
    op.execute("""
        CREATE TABLE observations (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            coverage_region_id uuid REFERENCES coverage_regions(id),
            title varchar(160), description text NOT NULL,
            manual_location varchar(500), observed_at timestamptz NOT NULL,
            submitted_at timestamptz NOT NULL DEFAULT now(),
            status varchar(16) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected')),
            media_type varchar(16) NOT NULL DEFAULT 'none'
                CHECK (media_type IN ('none','image','video','mixed')),
            anonymous boolean NOT NULL DEFAULT true,
            coverage_state varchar(16) NOT NULL
                CHECK (coverage_state IN ('inside','outside','uncertain','manual')),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            CHECK (length(trim(description)) BETWEEN 1 AND 5000)
        )
    """)
    op.execute("CREATE INDEX ix_observations_public ON observations(status, observed_at)")
    op.execute("CREATE INDEX ix_observations_coverage ON observations(coverage_region_id)")
    op.execute("""
        CREATE TABLE capture_locations (
            observation_id uuid PRIMARY KEY REFERENCES observations(id) ON DELETE CASCADE,
            geometry geometry(Point,4326) NOT NULL
                CHECK (ST_X(geometry) BETWEEN -180 AND 180 AND ST_Y(geometry) BETWEEN -90 AND 90),
            accuracy_meters double precision NOT NULL CHECK (accuracy_meters BETWEEN 0 AND 10000),
            captured_at timestamptz NOT NULL,
            source varchar(32) NOT NULL
                CHECK (source IN ('browser-geolocation','manual','drone'))
        )
    """)
    op.execute("""
        CREATE TABLE observation_locations (
            observation_id uuid PRIMARY KEY REFERENCES observations(id) ON DELETE CASCADE,
            geometry geometry(Geometry,4326) NOT NULL
                CHECK (ST_IsValid(geometry) AND NOT ST_IsEmpty(geometry)),
            reviewed_at timestamptz NOT NULL, source varchar(80) NOT NULL
        )
    """)
    op.execute("""
        CREATE TABLE public_locations (
            observation_id uuid PRIMARY KEY REFERENCES observations(id) ON DELETE CASCADE,
            geometry geometry(Geometry,4326) NOT NULL
                CHECK (ST_IsValid(geometry) AND NOT ST_IsEmpty(geometry))
                CHECK (GeometryType(geometry) IN ('POINT','POLYGON','MULTIPOLYGON')),
            label varchar(160) NOT NULL,
            precision_level varchar(32) NOT NULL,
            title varchar(160) NOT NULL, description text NOT NULL,
            generated_at timestamptz NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_public_geometry ON public_locations USING gist(geometry)")
    op.execute("""
        CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at = now(); RETURN NEW; END;
        $$
    """)
    for table in ("coverage_regions", "observations"):
        op.execute(
            f"CREATE TRIGGER set_updated_at BEFORE UPDATE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION set_updated_at()"
        )


def downgrade():
    for table in (
        "public_locations",
        "observation_locations",
        "capture_locations",
        "observations",
        "coverage_regions",
    ):
        op.execute(f"DROP TABLE {table}")
    op.execute("DROP FUNCTION set_updated_at()")
    # PostGIS may be shared by other applications; leave the extension installed.
