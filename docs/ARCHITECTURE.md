# Architecture & Security Decisions

This document highlights key architecture choices and secure defaults for the Security Posture Dashboard.

## High-level

- Backend: FastAPI (async) with modular architecture (repositories/services/routers).
- DB: MongoDB (motor) for flexible schema, accessed via a repository layer.
- Background tasks: RQ (Redis) worker to offload long running tasks.
- Frontend: React (Vite) + Tailwind with SPA served by nginx in production builds.

## Secure defaults

- Use a non-root process inside containers.
- Secrets via environment variables (example files provided). Use a secrets manager in production.
- Cookies are set HttpOnly and SameSite; set `COOKIE_SECURE=true` in production.
- Rate limiting implemented using Redis.
- Security headers applied via middleware (HSTS, CSP, X-Frame-Options, nosniff, etc.).
- Disable OpenAPI UI in production by setting `ENV=production`.

## Operational notes

- Use an HTTPS reverse proxy (eg. nginx, cloud load balancer) with certificate management.
- Run security scans and dependency checks (Snyk, Dependabot).
- Monitor runtime metrics and logs, export Prometheus metrics where appropriate.
