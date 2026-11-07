"""Lazy database configuration; never log SQL parameters containing capture points."""

import os
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


def database_url():
    if url := os.environ.get("DATABASE_URL"):
        return url
    password = os.environ.get("POSTGRES_PASSWORD")
    if not password:
        raise RuntimeError("Database is not configured")
    # Constructing a URL keeps passwords containing @, :, /, or % intact.
    return URL.create(
        "postgresql+psycopg",
        username=os.environ.get("POSTGRES_USER", "xerxes"),
        password=password,
        host=os.environ.get("POSTGRES_HOST", "127.0.0.1"),
        port=int(os.environ.get("POSTGRES_PORT", "5432")),
        database=os.environ.get("POSTGRES_DB", "xerxes"),
    )


@lru_cache
def get_engine():
    try:
        url = database_url()
    except RuntimeError as error:
        raise HTTPException(503, str(error)) from None
    return create_engine(url, pool_pre_ping=True, hide_parameters=True)


def get_session():
    with Session(get_engine()) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
