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

`go.mod` (rename module), `cmd/gastos/main.go` (+ `invite.go`), `internal/config`, `internal/db` (reset to a new `schema.sql` with your tables + users/sessions/invites, `baseVersion = 1`, empty `migrations`), `internal/api/{server,httpx,auth,invites,events,spa,housekeeping}.go` and `testutil_test.go`, `internal/events`, `internal/testutil`, `web/` (configs, `index.html`, `public/`, `src/main.tsx`, `src/app/{App,Shell,context,nav,TabBar,Sidebar,PageBar}`, `src/ui/` (all of it), `src/api/client.ts`, `src/hooks/useAction.ts`, `src/lib/theme.ts`, `src/styles*`, `src/test/`, `src/structure.test.ts`, `e2e/` helpers, `.npmrc`), `.golangci.yml`, `.github/` (`workflows/ci.yml`, `workflows/codeql.yml`, `dependabot.yml`, `pull_request_template.md`, `ISSUE_TEMPLATE/`), `deploy/gastos@.service`, `scripts/{remote-deploy,invite}.sh`, `docs/ops/vdi-setup.md`, `README.md` + `README.pt-BR.md` (rewrite both), `docs/security.md` and `docs/decisions.md` (rewrite), `AGENTS.md` + `CLAUDE.md` (`@AGENTS.md`), `.claude/settings.json` (superpowers and ponytail on), `LICENSE` (Apache-2.0).

Rename every `gastos`/`GASTOS_` (code, CI, unit, scripts, docs, manifest), then run all checks before the first commit.

## Before a PR (all must pass locally)

```bash
gofmt -l .            # prints nothing
go vet ./...
golangci-lint run      # only what the branch adds (new-from-merge-base: origin/master)
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

On every push and PR: `backend` (gofmt, vet, race tests), `lint` (golangci-lint, full history fetched for the merge base), `zizmor` (audits the workflows), `vuln` (govulncheck, `npm audit --omit=dev --audit-level=high`), `web` (lint, typecheck, vitest), `e2e` (build + Playwright, report uploaded on failure). On push: `build` (needs all four) builds `CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags "-s -w -X main.version=${GITHUB_SHA::7}"`. Only `master`: `deploy` (environment `production`, concurrency group so two merges never deploy at once) uploads the binary to `/opt/<app>/production/releases/<sha>/` and runs `scripts/remote-deploy.sh`, then smoke-tests `$PUBLIC_URL/healthz` (10 tries). Secrets: `DEPLOY_HOST`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`; variable: `PUBLIC_URL`. `permissions: contents: read`. Every action is pinned to a full commit SHA with the version in a comment, every checkout has `persist-credentials: false`, and the `build` job uses no dependency cache. `codeql.yml` scans Go and TypeScript on push to master, on PRs and weekly. Required checks on master: backend, lint, zizmor, vuln, web, e2e, build. Details and reasons in [security.md](security.md).

## VPS

- `remote-deploy.sh <env> <sha> <port>`: atomically repoints `current` to the release, restarts `<app>@<env>`, polls `http://127.0.0.1:<port>/healthz` for 10 s, keeps the 5 newest releases, and rolls back to the previous release if healthz fails.
- systemd unit (copy `deploy/gastos@.service`): `User=<app>`, `EnvironmentFile=/etc/<app>/%i.env`, `ExecStart=/opt/<app>/%i/current/<app>`, `Restart=on-failure`, and the hardening block (`NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `ReadWritePaths=/var/lib/<app>/%i`, `PrivateTmp`, `PrivateDevices`, `ProtectKernel*`, `RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX`, `CapabilityBoundingSet=`, `SystemCallFilter=@system-service`, `LockPersonality`, `RestrictNamespaces`).
- Caddy (HTTPS automatic): `<app>.<domain> { reverse_proxy 127.0.0.1:<port> }`.
- `deploy` may only restart that service: `/etc/sudoers.d/<app>-deploy` with `deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart <app>@production` (check with `visudo -c`). Gustavo runs the one-time root setup from `docs/ops/vdi-setup.md`; write the steps down, never run root commands on the server.
- Backups: daily local copy by the app; off-site encrypted copy by a separate timer (`docs/ops/backup.md`).

## Git and PR flow

- Every change starts from an issue, opened with one of the forms (`1-bug.yml`, `2-feature.yml`, `3-task.yml`; blank issues are off, vulnerabilities go to private reporting). A bug gets steps, expected and actual.
- Branch from an updated `master`: `feat/<topic>`, `fix/<topic>`, `chore/…`, `docs/…`. Never commit to `master`.
- Commits in English, Conventional style, subject in lower case describing the effect for the person: `feat: warn before adding a duplicate of the last transaction`, `fix(web): …`, `test(e2e): …`. The body says why and ends with `Refs #N` and the Co-Authored-By trailer the harness gives.
- PR title in English; the body follows `.github/pull_request_template.md`: `Closes #N`, what changes, why, how it was tested (each suite and its result), risk (migration and rollback, auth or money, screenshots). End with the harness's attribution line.
- Merge with a merge commit (`gh pr merge N --merge`) only after CI is green **and Gustavo explicitly says to**. Then watch the master run to the end and check `curl https://<app>.<domain>/healthz` → `ok`, and tell Gustavo what to try.
- Specs and plans in English under `docs/superpowers/specs/` and `docs/superpowers/plans/` (`YYYY-MM-DD-<topic>…md`), committed, and each lasting decision gets a line in `docs/decisions.md`.
