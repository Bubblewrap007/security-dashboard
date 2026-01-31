# Security Checklist

Before production deployment, review and apply the following items:

- [ ] Rotate `SECRET_KEY` to a high-entropy secret and store securely (Vault/KMS).
- [ ] Set `COOKIE_SECURE=true` and run over HTTPS.
- [ ] Configure strict CORS origins, not `*`.
- [ ] Add RBAC and fine-grained authorization on all endpoints.
- [ ] Ensure scan reports include a clear scope disclaimer that only public checks were performed and no intrusive activity was executed.
- [ ] Harden nginx and reverse proxy with correct headers and TLS params.
- [ ] Enable logging aggregation and retention policies.
- [ ] Run dependency vulnerability scans and apply fixes.
- [ ] Implement automated backups for MongoDB and Redis persistence.
- [ ] Configure and test Redis for persistence and authentication.
- [ ] Configure automated tests and security regression suites in CI.
