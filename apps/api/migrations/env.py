"""Database URL is environment-only; no credentials are stored in Alembic config."""

from alembic import context
from sqlalchemy import create_engine, pool

from xerxes_api import models  # noqa: F401
from xerxes_api.db import Base, database_url


def include_object(_object, name, type_, reflected, compare_to):
    # PostGIS extension tables and unrelated applications are not owned by this migration set.
    return not (
        type_ == "table" and reflected and compare_to is None and name not in Base.metadata.tables
    )


url = database_url()
if context.is_offline_mode():
    context.configure(
        url=url, target_metadata=Base.metadata, literal_binds=True, include_object=include_object
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(url, poolclass=pool.NullPool, hide_parameters=True)
    with engine.connect() as connection:
        context.configure(
            connection=connection, target_metadata=Base.metadata, include_object=include_object
        )
        with context.begin_transaction():
            context.run_migrations()
