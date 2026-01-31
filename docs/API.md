# API Endpoints (MVP)

Auth

- POST /api/v1/auth/register — register {username, email, password}
- POST /api/v1/auth/login — login (sets HttpOnly cookie)
- POST /api/v1/auth/logout — clear cookie
- GET /api/v1/auth/me — current user

Assets

- POST /api/v1/assets — add asset {type: email|domain, value}
- GET /api/v1/assets — list assets for current user

Scans

- POST /api/v1/scans — start scan {asset_ids: [ids]}
- GET /api/v1/scans — list scans for current user
- GET /api/v1/scans/{scan_id} — scan details
- GET /api/v1/scans/{scan_id}/findings — list findings
- GET /api/v1/scans/{scan_id}/report — download PDF report

Notes: All endpoints require authentication via the session cookie set on login. Scans are queued to Redis RQ workers and execute asynchronously; status can be polled via the scan endpoints.
