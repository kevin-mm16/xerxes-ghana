FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml ./pyproject.toml
COPY src ./src
RUN pip install --no-cache-dir .
COPY alembic.ini ./alembic.ini
COPY migrations ./migrations
EXPOSE 8000
CMD ["uvicorn", "xerxes_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
