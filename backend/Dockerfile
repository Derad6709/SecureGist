FROM python:3.14-alpine3.22 AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY alembic.ini ./
COPY migrations ./migrations
COPY src ./src
RUN uv sync --frozen --no-dev --no-editable

FROM python:3.14-alpine3.22@sha256:b0d9cd5ed77285b2563c86ca10b53578249ca1a08d14e5b69b7970884a9fb539

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/alembic.ini /app/alembic.ini
COPY --from=builder /app/migrations /app/migrations
COPY --from=builder /app/src /app/src

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["sh", "-c", "python -m src.run_migrations && exec python -m uvicorn src.main:app --host 0.0.0.0 --port 8000"]
