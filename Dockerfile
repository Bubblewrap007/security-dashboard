# This Dockerfile is for Railway deployment
# Railway will use docker-compose.yml to orchestrate services

FROM docker/compose:latest

WORKDIR /app

COPY docker-compose.yml .
COPY backend ./backend
COPY frontend ./frontend

# Railway will execute the startCommand from railway.json
CMD ["docker-compose", "up"]
