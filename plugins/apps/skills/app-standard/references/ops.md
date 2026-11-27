# Tests, deploy and workflow

Reference: `.github/workflows/ci.yml`, `deploy/`, `scripts/`, `docs/ops/` and `web/playwright.config.ts` in https://github.com/gucardona/gastos.app.

## Names and ports per app

| | gastos (reference) | a new app `<app>` |
|---|---|---|
| Public URL | `https://gastos.<domain>` | `https://<app>.<domain>` |
| Port on 127.0.0.1 | 8000 | the next one not in the "Apps in the family" table of SKILL.md (8001, 8002…); Gustavo confirms it on the VPS with `ss -ltnp`, then add the row |
| Binary / Go module | `gastos` | `<app>` |
| systemd unit | `gastos@.service` (instance `production`) | `<app>@.service` |
| Release dir | `/opt/gastos/production/{releases/<sha>,current}` | `/opt/<app>/production/…` |
| Data | `/var/lib/gastos/production` | `/var/lib/<app>/production` |
| Env file | `/etc/gastos/production.env` (root:root 600) | `/etc/<app>/production.env` |
| System user | `gastos` | `<app>` |
| Env prefix | `GASTOS_` | `<APP>_` |

The `deploy` user and its SSH key are shared; each app gets its own system user, directories, unit and Caddy block. Add the new app to the tools site's list of links.

## Skeleton to copy from gastos.app

`go.mod` (rename module), `cmd/gastos/main.go` (+ `invite.go`), `internal/config`, `internal/db` (reset to a new `schema.sql` with your tables + users/sessions/invites, `baseVersion = 1`, empty `migrations`), `internal/api/{server,httpx,auth,invites,events,spa,housekeeping}.go` and `testutil_test.go`, `internal/events`, `internal/testutil`, `web/` (configs, `index.html`, `public/`, `src/{main,App,Shell,context}.tsx`, `src/api/client.ts`, `src/components/{Sheet,ListGroup,Segmented,Switch,Toast,ConfirmButton,ErrorBoundary,Icon,TabBar,Sidebar,nav,PageBar,pickers,EmojiPicker,ColorSwatches}`, `src/hooks/useAction.ts`, `src/lib/theme.ts`, `src/styles*`, `src/test/`, `e2e/` helpers), `.github/workflows/ci.yml`, `deploy/gastos@.service`, `scripts/{remote-deploy,invite}.sh`, `docs/ops/vdi-setup.md`, `README.md` (rewrite), `LICENSE` (Apache-2.0).

Rename every `gastos`/`GASTOS_` (code, CI, unit, scripts, docs, manifest), then run all checks before the first commit.

## Before a PR (all must pass locally)

```bash
gofmt -l .            # prints nothing
go vet ./...
go test -race ./...   # Windows/Git Bash: export PATH="$PATH:/c/msys64/ucrt64/bin" first
cd web
npm run lint
npm run typecheck
npm test
npm run build && npm run e2e
rm -f tsconfig.tsbuildinfo   # do not commit it
```

## E2E (Playwright)

- `playwright.config.ts`: `testDir: "e2e"`, one worker, retries 1 on CI, trace on failure; two projects: `desktop` and `mobile` (`devices["Pixel 5"]`), so every flow runs on both navigations.
- `webServer`: `go run ./cmd/<app>` from the repo root on a test port (gastos: 18080) with a fresh DB under `web/e2e-data/`, `COOKIE_SECURE=false`, a fixed invite code; any external API is a local fake (`node e2e/fake-*.mjs`). A real key never enters tests.
- Flows sign up a new user per test (`signUpAndEnter(page, "Caio")`), use visible labels and roles, and create data through the UI or `page.evaluate(fetch(...))`.
- Dates are relative to today and must not change meaning with the day the test runs (choose a date whose outcome holds every day of the month).

## CI (`.github/workflows/ci.yml`, copy it)

On every push and PR: `backend` (gofmt, vet, race tests), `vuln` (govulncheck, `npm audit --omit=dev --audit-level=high`), `web` (lint, typecheck, vitest), `e2e` (build + Playwright, report uploaded on failure). On push: `build` (needs all four) builds `CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags "-s -w -X main.version=${GITHUB_SHA::7}"`. Only `master`: `deploy` (environment `production`, concurrency group so two merges never deploy at once) uploads the binary to `/opt/<app>/production/releases/<sha>/` and runs `scripts/remote-deploy.sh`, then smoke-tests `$PUBLIC_URL/healthz` (10 tries). Secrets: `DEPLOY_HOST`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`; variable: `PUBLIC_URL`. `permissions: contents: read`.

## VPS

- `remote-deploy.sh <env> <sha> <port>`: atomically repoints `current` to the release, restarts `<app>@<env>`, polls `http://127.0.0.1:<port>/healthz` for 10 s, keeps the 5 newest releases, and rolls back to the previous release if healthz fails.
- systemd unit (copy `deploy/gastos@.service`): `User=<app>`, `EnvironmentFile=/etc/<app>/%i.env`, `ExecStart=/opt/<app>/%i/current/<app>`, `Restart=on-failure`, and the hardening block (`NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `ReadWritePaths=/var/lib/<app>/%i`, `PrivateTmp`, `PrivateDevices`, `ProtectKernel*`, `RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX`, `CapabilityBoundingSet=`, `SystemCallFilter=@system-service`, `LockPersonality`, `RestrictNamespaces`).
- Caddy (HTTPS automatic): `<app>.<domain> { reverse_proxy 127.0.0.1:<port> }`.
- `deploy` may only restart that service: `/etc/sudoers.d/<app>-deploy` with `deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart <app>@production` (check with `visudo -c`). Gustavo runs the one-time root setup from `docs/ops/vdi-setup.md`; write the steps down, never run root commands on the server.
- Backups: daily local copy by the app; off-site encrypted copy by a separate timer (`docs/ops/backup.md`).

## Git and PR flow

- Branch from an updated `master`: `feat/<topic>`, `fix/<topic>`, `chore/…`. Never commit to `master`.
- Commits in pt-BR Conventional style, subject in lower case describing the effect for the person: `feat: avisa antes de lançar um igual ao que acabou de ser lançado`, `fix(web): …`, `test(e2e): …`. End each message with the Co-Authored-By trailer the harness gives.
- PR title in pt-BR; body in pt-BR: "O que muda" (behavior, in the person's words), "Banco" (migration and rollback, or "sem mudança"), "Testes" (each suite and its result). End with the harness's attribution line.
- Merge with a merge commit (`gh pr merge N --merge`) only after CI is green **and Gustavo explicitly says to**. Then watch the master run to the end and check `curl https://<app>.<domain>/healthz` → `ok`, and tell Gustavo what to try.
- Specs and plans in pt-BR under `docs/superpowers/specs/` and `docs/superpowers/plans/` (`YYYY-MM-DD-<topic>…md`), committed.
