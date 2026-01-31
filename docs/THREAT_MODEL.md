# Threat Model (High level)

Scope:

- Only public-facing, non-intrusive checks are performed (DNS, public web endpoints, certificate checks, HIBP via API for email breach lookup).
- No authentication or credentialed scans are performed.

Threats considered:

- Data leakage of sensitive info — Avoid logging or storing credentials; do not store raw API responses containing sensitive tokens.
- Abuse of scanning service — Rate-limit scanning endpoints and queue scans via worker to prevent abuse.
- Supply chain — Use pinned deps and run vulnerability scans in CI before deploy.

Limitations:

- This project does not perform active network attacks or authenticated scans.
- HIBP email breach checks require an API key and are subject to HIBP rate limits and terms.

Mitigations:

- Rate limiting, job queueing, and monitoring.
- Clear scope disclaimer in generated reports indicating public checks only.
