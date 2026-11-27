# Security standard

Reference: `internal/api/server.go`, `auth.go`, `httpx.go`, `.github/`, `web/.npmrc` and `docs/security.md` in https://github.com/gucardona/gastos.app. Each app keeps its own `docs/security.md`: what it protects, from whom, the controls, the known gaps. Update it when a change adds a new kind of data, a new way in, a new secret or a new external service.

## In the app (copy from gastos)

- Headers on every response: CSP without inline scripts, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, HSTS when cookies are secure.
- Sessions: a random token in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). Only its SHA-256 is stored.
- CSRF: writes accept only JSON, and unsafe requests whose `Sec-Fetch-Site` is another site are refused. (Go 1.25's `http.CrossOriginProtection` does the same and may replace the hand-written check.)
- Passwords with bcrypt. Login rate-limited by IP and by e-mail. An unknown e-mail takes as long as a wrong password.
- Every container route goes through the membership and role check before the handler runs.
- JSON bodies capped at 1 MB with unknown fields rejected. Uploads have their own cap. SQL takes values only through placeholders.
- `ReadHeaderTimeout` on the server.
- Secrets at rest (users' API keys) encrypted with AES-GCM under `<APP>_SECRET_KEY`. Store only the last 4 digits of a card.

## Secrets

- Never in code, tests, logs, error messages, docs, issues, chat or commits.
- Production: `/etc/<app>/production.env` (root, 600). CI: GitHub secrets, used only in the `production` environment.
- The repo commits `.claude/settings.json` with `permissions.deny` for reading `.env*`, keys, `data/` and database copies, and for `sudo`.
- GitHub secret scanning and push protection on.

## CI/CD supply chain (OWASP Top 10 2025, A03)

- Every action pinned to a full commit SHA, with the version in a comment. Dependabot keeps the pins current.
- Workflows default to `permissions: contents: read`. A job gets more only when it needs it (CodeQL: `security-events: write`).
- Checkouts use `persist-credentials: false`.
- The job that builds the release binary uses no dependency cache.
- No `pull_request_target` that checks out the PR, and no untrusted `${{ }}` inside `run:`.
- zizmor audits the workflows on every push and PR. CodeQL scans Go and TypeScript. golangci-lint runs gosec. `govulncheck` and `npm audit --omit=dev --audit-level=high` run on every push.
- `web/.npmrc`: `ignore-scripts=true` and `min-release-age=7`.
- `dependabot.yml`: weekly, minor and patch grouped, `cooldown: default-days: 7` (zizmor asks for at least 7). Dependabot alerts and security updates on.
- Deploy only from master, through the `production` environment. Branch protection requires backend, lint, zizmor, vuln, web, e2e and build.
- Private vulnerability reporting on, linked from the issue forms' `config.yml`.
