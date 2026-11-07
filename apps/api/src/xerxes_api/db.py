"""Lazy database configuration; never log SQL parameters containing capture points."""

import os
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


@lru_cache
def get_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise HTTPException(503, "Database is not configured")
    return create_engine(url, pool_pre_ping=True, hide_parameters=True)


def get_session():
    with Session(get_engine()) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
