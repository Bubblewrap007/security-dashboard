FROM python:3.11-slim

# Create a non-root user for security
RUN useradd --create-home appuser
WORKDIR /app

COPY requirements.txt .
# Install build dependencies required by some wheels (pycairo/reportlab)
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential pkg-config libcairo2-dev libgirepository1.0-dev libpango1.0-dev libffi-dev python3-dev meson ninja-build \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

# Copy application files and adjust ownership
COPY . .
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Run with gunicorn + uvicorn workers for production
ENV PYTHONPATH=/app
# Use PORT env var from Railway, default to 8000 if not set
CMD gunicorn -k uvicorn.workers.UvicornWorker -b 0.0.0.0:${PORT:-8000} app.main:app
