"""Real PostGIS integration fixtures. An explicitly named *_test database is required."""

import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from xerxes_api.db import get_session
from xerxes_api.main import app


@pytest.fixture(scope="session")
def migration_config():
    return Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))


@pytest.fixture(scope="session")
def db_engine(migration_config):
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to run the real PostGIS suite")
    if not make_url(url).database.endswith("_test"):
        raise RuntimeError("Integration tests require a database name ending in _test")
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = url
    try:
        command.upgrade(migration_config, "head")
    finally:
        if previous is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = previous
    engine = create_engine(url, hide_parameters=True)
    yield engine
    engine.dispose()


@pytest.fixture
def spatial(db_engine):
    with db_engine.connect() as connection:
        transaction = connection.begin()
        with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
            session.execute(text("DELETE FROM public_locations"))
            session.execute(text("DELETE FROM capture_locations"))
            session.execute(text("DELETE FROM observation_locations"))
            session.execute(text("DELETE FROM observations"))
            session.execute(text("DELETE FROM coverage_regions"))
            session.execute(
                text("""
                INSERT INTO coverage_regions(code,name,description,geometry,valid_from,is_demo)
                VALUES ('GHA-XER-T001','Test square','Synthetic integration polygon',
                  ST_Multi(ST_GeomFromText('POLYGON((-2 5,-1 5,-1 6,-2 6,-2 5))',4326)),
                  '2020-01-01T00:00:00Z',true)
            """)
            )
            session.commit()

            def override():
                yield session

            app.dependency_overrides[get_session] = override
            try:
                with TestClient(app) as client:
                    yield client, session
            finally:
                app.dependency_overrides.clear()
        transaction.rollback()
