FROM ghcr.io/astral-sh/uv:alpine

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

WORKDIR /app

# Copy only requirements to cache them in docker layer
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev --no-install-project

# Copy application code
COPY src/ ./src/

# Install the project itself
RUN uv sync --frozen --no-dev

# Ensure the app runs from the virtualenv created by uv
ENV PATH="/app/.venv/bin:$PATH"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]