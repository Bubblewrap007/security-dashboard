# Build stage

FROM node:18-alpine as builder
WORKDIR /app
COPY package.json package-lock.json* ./
# Ensure a clean install to prevent duplicate React
RUN rm -rf node_modules package-lock.json
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY . .
# Build with environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production stage - serve with nginx
FROM nginx:1.25-alpine

# Create startup script that handles PORT variable
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'PORT=${PORT:-80}' >> /start.sh && \
    echo 'if [ "$ENABLE_PROXY" = "true" ]; then' >> /start.sh && \
    echo '  cat > /etc/nginx/conf.d/default.conf <<EOF' >> /start.sh && \
    echo 'server {' >> /start.sh && \
    echo '  listen $PORT;' >> /start.sh && \
    echo '  server_name _;' >> /start.sh && \
    echo '  root /usr/share/nginx/html;' >> /start.sh && \
    echo '  index index.html;' >> /start.sh && \
    echo '  location / {' >> /start.sh && \
    echo '    try_files \$uri \$uri/ /index.html;' >> /start.sh && \
    echo '  }' >> /start.sh && \
    echo '  location /api/ {' >> /start.sh && \
    echo '    proxy_pass http://backend:8000/api/;' >> /start.sh && \
    echo '    proxy_http_version 1.1;' >> /start.sh && \
    echo '    proxy_set_header Upgrade \$http_upgrade;' >> /start.sh && \
    echo '    proxy_set_header Connection "upgrade";' >> /start.sh && \
    echo '    proxy_set_header Host \$host;' >> /start.sh && \
    echo '    proxy_set_header X-Real-IP \$remote_addr;' >> /start.sh && \
    echo '    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;' >> /start.sh && \
    echo '    proxy_set_header X-Forwarded-Proto \$scheme;' >> /start.sh && \
    echo '  }' >> /start.sh && \
    echo '  location /health {' >> /start.sh && \
    echo '    proxy_pass http://backend:8000/health;' >> /start.sh && \
    echo '  }' >> /start.sh && \
    echo '}' >> /start.sh && \
    echo 'EOF' >> /start.sh && \
    echo 'else' >> /start.sh && \
    echo '  cat > /etc/nginx/conf.d/default.conf <<EOF' >> /start.sh && \
    echo 'server {' >> /start.sh && \
    echo '  listen $PORT;' >> /start.sh && \
    echo '  server_name _;' >> /start.sh && \
    echo '  root /usr/share/nginx/html;' >> /start.sh && \
    echo '  index index.html;' >> /start.sh && \
    echo '  location / {' >> /start.sh && \
    echo '    try_files \$uri \$uri/ /index.html;' >> /start.sh && \
    echo '  }' >> /start.sh && \
    echo '}' >> /start.sh && \
    echo 'EOF' >> /start.sh && \
    echo 'fi' >> /start.sh && \
    echo 'exec nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

COPY --from=builder /app/dist /usr/share/nginx/html

CMD ["/start.sh"]
