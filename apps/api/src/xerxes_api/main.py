"""XERSXES modular API: private intake, public geospatial data, separate publication."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from xerxes_api.auth import router as auth_router
from xerxes_api.coverage import router as coverage_router
from xerxes_api.db import get_engine
from xerxes_api.map_features import router as map_router
from xerxes_api.moderation import router as moderation_router
from xerxes_api.observations import router as observation_router
from xerxes_api.public_delivery import router as public_delivery_router
from xerxes_api.uploads import router as uploads_router

app = FastAPI(title="XERSXES Ghana API", version="0.2.0")
app.include_router(coverage_router)
app.include_router(observation_router)
app.include_router(map_router)
app.include_router(uploads_router)
app.include_router(auth_router)
app.include_router(moderation_router)
app.include_router(public_delivery_router)


@app.middleware("http")
async def prevent_sensitive_caching(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(RequestValidationError)
async def invalid_request(_request, exc):
    # FastAPI's default error includes submitted input, potentially passwords,
    # capability tokens or private evidence. Return only safe field locations.
    return JSONResponse(
        status_code=422,
        content={
            "detail": [
                {
                    "loc": list(error["loc"]),
                    "msg": "Invalid or missing field",
                    "type": error["type"],
                }
                for error in exc.errors()
            ]
        },
    )


@app.exception_handler(SQLAlchemyError)
async def database_unavailable(_request, _exc):
    # Never serialize database exceptions or SQL parameters to an intake caller.
    return JSONResponse(status_code=503, content={"detail": "Database temporarily unavailable"})


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "xerxes-api"}


@app.get("/ready", tags=["system"])
def ready():
    with get_engine().connect() as connection:
        connection.execute(text("SELECT 1 FROM coverage_regions LIMIT 1"))
        connection.execute(text("SELECT 1 FROM administrative_boundaries LIMIT 1"))
        connection.execute(text("SELECT 1 FROM evidence_media LIMIT 1"))
        connection.execute(text("SELECT 1 FROM reviewers LIMIT 1"))
        connection.execute(text("SELECT 1 FROM observation_reviews LIMIT 1"))
        connection.execute(text("SELECT 1 FROM published_media LIMIT 1"))
        connection.execute(text("SELECT PostGIS_Version()"))
    return {"status": "ready"}


@app.get("/api/v1", tags=["system"])
def api_root() -> dict[str, str]:
    return {"name": "XERSXES Ghana", "version": "v1"}
