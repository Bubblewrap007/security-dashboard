# Build stage

FROM node:22-alpine as builder
WORKDIR /app
COPY package.json package-lock.json ./
# Ensure a clean install to prevent duplicate React
RUN rm -rf node_modules
RUN npm ci --no-audit --no-fund
COPY . .
# Build with environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production stage - serve with nginx
FROM nginx:1.25-alpine


# Use nginx config template (PORT substituted at runtime by Railway)
COPY nginx.conf /etc/nginx/conf.d/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

# envsubst replaces ${PORT} in the template; default to 80 for local Docker
CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
