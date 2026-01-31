# Security Dashboard (Monorepo)

This repository contains a minimal monorepo with:

- /backend — FastAPI (Python 3.11)
- /frontend — React (Vite) + Tailwind
- docker-compose that runs backend, frontend, MongoDB and Redis

## Quick start ✅

1. Copy env examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Build and run (development):

```bash
docker-compose up --build
```

3. Open the frontend at http://localhost:5173 and backend at http://localhost:8000

Seed/demo data:

```bash
# run inside backend container or locally after installing deps
python backend/scripts/seed_demo.py
```

Security docs:

- Threat model: `docs/THREAT_MODEL.md`
- Architecture: `docs/ARCHITECTURE.md`
- Security checklist: `docs/SECURITY_CHECKLIST.md`

Notes:

- This is an initial implementation of the Security Posture Dashboard (MVP): authentication, asset management, asynchronous scans (RQ), public-only checks (HIBP, DNS/SPF/DMARC/DKIM, web headers, TLS), scoring, findings persistence, and PDF reports.
- Scope: only public checks against public endpoints and DNS — no credentialed or intrusive scanning is performed. See `docs/SECURITY_CHECKLIST.md` and `docs/ARCHITECTURE.md` for more information.
