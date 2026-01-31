# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json package-lock.json* ./
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
    echo 'cat > /etc/nginx/conf.d/default.conf <<EOF' >> /start.sh && \
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
    echo 'exec nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

COPY --from=builder /app/dist /usr/share/nginx/html

CMD ["/start.sh"]
