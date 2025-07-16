FROM python:3.12.3-slim

WORKDIR /app

# Install minimal required system packages and cleanup
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHONPATH=/app

COPY . .

CMD ["uvicorn", "video_service.app:app", "--host", "0.0.0.0", "--port", "8001"]
