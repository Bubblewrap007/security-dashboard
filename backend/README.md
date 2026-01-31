# Backend (FastAPI)

Quick notes:

- Python 3.11
- Run locally (if you have Python):

```bash
python -m venv .venv
source .venv/bin/activate  # or .\.venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Environment variables: copy `.env.example` to `.env` before running.

- Production and security notes:
  - Set `COOKIE_SECURE=true` when running over HTTPS in production.
  - Ensure `SECRET_KEY` is a high-entropy value and not checked into source control.
  - Use an HTTPS reverse proxy (eg. nginx) in front of the app for TLS termination and additional security headers.

- Worker (RQ): The repository includes an RQ worker service in `docker-compose.yml` named `worker` which runs background jobs.

## Scanning features

- Add assets (email or domain) via API or the frontend.
- Start a scan which queues work to the RQ worker. Scans run public-only checks (HIBP for email, DNS/SPF/DMARC/DKIM for domains, TLS and security headers for HTTPS websites).
- PDF reports are available via `/api/v1/scans/{scan_id}/report`.

## Dev notes

- Set `HIBP_API_KEY` if you want email breach lookups to run (Have I Been Pwned - breachedaccount endpoint requires an API key).
- Run `docker-compose up --build` to start backend, worker, mongo, redis, and frontend.
