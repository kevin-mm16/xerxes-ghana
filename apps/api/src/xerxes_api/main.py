"""Entry point for the XERSXES Ghana modular API."""

from fastapi import FastAPI

app = FastAPI(
    title="XERSXES Ghana API",
    version="0.1.0",
    description="Development scaffold; no sensitive reporting routes enabled.",
)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    """Liveness endpoint. Does not imply database or service readiness."""
    return {"status": "ok", "service": "xerxes-api"}


@app.get("/api/v1", tags=["system"])
def api_root() -> dict[str, str]:
    """Versioned API discovery endpoint."""
    return {"name": "XERSXES Ghana", "version": "v1"}
