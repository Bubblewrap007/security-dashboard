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


# Use static nginx config for direct API calls
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
