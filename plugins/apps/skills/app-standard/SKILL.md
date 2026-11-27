---
name: app-standard
description: Use when starting, scaffolding, planning or changing any of Gustavo's own web apps (the gastos.app family, each on a subdomain of the apps' domain and linked from the tools site), or when Gustavo asks for "o mesmo padrão", "igual ao gastos", same UI/UX/code/stack/deploy as the other apps, a new app for the tools site, or a screen, component, endpoint, migration, test or deploy step in one of these apps.
---

# Gustavo's app standard (gastos.app is the reference)

## Overview

Every app Gustavo builds is a sibling of **gastos.app**: same stack, same layout, same look, same UX rules, same tests, same deploy. The reference implementation is public: https://github.com/gucardona/gastos.app (locally `C:\Users\Gustavo\dev\gastos.app`).

**`<domain>`** in this skill is the apps' domain, which may change: read the current one from the `PUBLIC_URL` repository variable of gastos.app (`gh variable get PUBLIC_URL --repo gucardona/gastos.app`) and never write it into a skill.

**Core principle: copy, don't invent.** When the standard below or the reference repo answers a question (a color, a component, an error format, a deploy step), use that answer. Pick something new only where the reference has nothing, and say so to Gustavo as your call.

## Quick reference

| Area | The standard |
|---|---|
| Backend | Go (latest stable, go.mod floor), `net/http` with Go 1.22+ method routing, `log/slog` JSON, no web framework |
| Database | SQLite via `modernc.org/sqlite` (pure Go, `CGO_ENABLED=0`), WAL, frozen `schema.sql` + additive numbered migrations |
| Frontend | React 19 + Vite + TypeScript (strict), TanStack Query, `react-router`, Biome lint, no UI kit, no CSS framework |
| One binary | `web/dist` is embedded (`//go:embed all:dist`); Go serves API under `/api` and the SPA; `/healthz` answers `ok` |
| Font, colors | Geist Variable (`@fontsource-variable/geist`), tokens in `web/src/styles/tokens.css` (exact hex in [references/frontend.md](references/frontend.md)) |
| Navigation | phone: floating pill tab bar + round "+" apart; ≥900px: 248px sidebar. Settings ("Ajustes") only through the avatar |
| Forms | bottom `Sheet` on a native `<dialog>` (side panel on desktop), grouped `ListGroup`/`ListRow`, `Segmented`, `Switch` |
| Delete | two-step `ConfirmButton` ("Excluir X" → "Confirmar exclusão"), and a toast with "Desfazer" when it can be recreated. Never `window.confirm`, never a confirm modal |
| Language | UI and docs in pt-BR; code, comments, identifiers and tests in English; money in cents (int), dates `YYYY-MM-DD` |
| API errors | `{"error":{"code","message","fields"}}`, message in pt-BR ready to show |
| Auth | own session cookie (httpOnly, SameSite=Lax), bcrypt, rate-limited login, invite codes to sign up |
| Tests | `go test -race` with real SQLite via httptest; Vitest + Testing Library by role and name; Playwright e2e on desktop and Pixel 5 against the real binary |
| Deploy | GitHub Actions: tests → build Linux binary → scp to VPS → `remote-deploy.sh` (symlink, restart systemd `<app>@production`, healthz, auto rollback) → smoke test public URL. Caddy in front. No Docker |
| Git | branch `feat/…` or `fix/…` from `master`; commits pt-BR Conventional (`feat: …`, `fix(web): …`); PR; merge only after CI is green **and Gustavo says so** (merge = production deploy) |

Read the reference file for the area you are working on before writing code there:

- **[references/backend.md](references/backend.md)**: Go layout, server and middleware chain, handlers, errors, decode, auth, SQLite, migrations, config, Go tests.
- **[references/frontend.md](references/frontend.md)**: web layout, exact tokens, the base CSS, every house component and when to use it, data fetching, theming, PWA, Vitest conventions.
- **[references/ux.md](references/ux.md)**: interaction rules and pt-BR copy (buttons, toasts, errors, empty states, confirmations, alignment, accessibility).
- **[references/ops.md](references/ops.md)**: CI workflow, VPS layout, systemd unit, deploy script, Caddy, backups, Playwright setup, git and PR flow, the per-app names and ports.

## Starting a new app

1. **Ask only what is truly open**, in one message: the app's name (slug, e.g. `tarefas`), what it does and who uses it, and whether it needs a login of its own (see "Open decisions"). Everything else comes from this skill.
2. **Start from the reference repo.** Clone gastos.app into a scratch folder and copy the skeleton (list in references/ops.md "Skeleton to copy"), then rename: Go module, binary, `GASTOS_` env prefix → `<APP>_`, systemd unit, paths, manifest, page title. Delete the finance-specific packages and screens; keep the shell, components, auth, db, middleware, CI, deploy.
3. **Keep tokens.css, styles.css base rules and the components identical** (copy them; do not restyle). Screens are new; the vocabulary they are built from is not.
4. Write the spec in pt-BR at `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and get Gustavo's approval before building.
5. Pick the next free port and the subdomain `<app>.<domain>` ([references/ops.md](references/ops.md)), and add it to the tools site list.
6. Green locally (all commands in references/ops.md "Before a PR"), PR, wait for Gustavo's ok to merge, watch the deploy and `healthz`.

## Shaping a new app's skeleton

- **Shared container.** gastos scopes data to a *carteira* (wallet) with members and roles (owner, editor, reader), so Gustavo and Rafa see the same data. Keep that pattern in every app whose data is shared, renamed to the app's own word (`casa`, `lista`…): same tables shape (`<container>s`, `<container>_members` with `role`), same `requireWallet`-style middleware and `/api/<container>s/{id}/…` routes, same invite of a member by e-mail. Drop it only for an app that is truly personal.
- **Main action.** The round "+" (and `N` on desktop) is the action people do most often in this app. If the app has no frequent creation (a read-mostly app), leave the "+" out instead of inventing one.
- **Destinations.** 3 to 5, nouns in pt-BR, the first one answers the question people open the app for.
- **First accounts.** Gustavo signs up first (free); Rafa joins with a single-use code Gustavo generates on the VPS (`sudo <app>-invite`, script in [references/ops.md](references/ops.md)), and is then invited to the container.

## Apps in the family (update when one is added)

| App | URL | Port | Repo |
|---|---|---|---|
| gastos | `https://gastos.<domain>` | 8000 | github.com/gucardona/gastos.app |

The tools site that links them does not exist yet; when it does, add a row for it and say here how to add a link.

## Open decisions (ask Gustavo, do not guess)

- **Login shared across apps or one per app?** Until Gustavo decides, each app copies the gastos auth (own users table and cookie). Do not build SSO on your own.
- **Per-app accent color?** Default: the same `--accent` as gastos. Change it only if Gustavo asks, and then change only `--accent` (both themes) and the manifest colors.
- **Shared component package?** Default: copy the files. Propose a package only when a third app copies the same components.

## Rules that hold in every app

- **Every app has the full pipeline from its first commit**, the same as gastos: `.github/workflows/ci.yml` with backend, vuln, web and e2e jobs on every push and PR, then build and the automatic deploy of `master` with healthz, rollback and the public URL smoke test ([references/ops.md](references/ops.md)). An app without it is not ready for its first PR; do not deploy by hand.
- **Production data is never reset.** Schema changes are new migration files that only add; never edit `schema.sql` or a published migration; every migration gets its rollback documented and tested ([references/backend.md](references/backend.md)).
- **Never paste secrets** (API keys, `*_SECRET_KEY`, deploy keys) in chat, code, docs or commits; they live in `/etc/<app>/production.env` (root, 600) and GitHub secrets.
- **Ask before merging**: merging to `master` deploys to production.
- **Tests come with the change**, and e2e tests never depend on today's date (compute dates relative to now, or freeze the server clock in Go tests).

## Common mistakes

| Tempting | The standard |
|---|---|
| "Node/Fastify (or Next.js) is quicker to set up" | Go + net/http, copied from gastos; one binary embeds the web build |
| Tailwind, shadcn, MUI, Inter, an indigo palette | tokens.css + styles.css + Geist, copied as they are |
| A confirm dialog for delete | `ConfirmButton` two-step, plus "Desfazer" toast when possible |
| Docker / docker-compose | static binary + systemd unit + `remote-deploy.sh` |
| Monorepo with workspaces (`apps/api`, `apps/web`) | `cmd/<app>`, `internal/…`, `web/` in one Go module |
| Postgres "to be safe" | SQLite file in `/var/lib/<app>/production` |
| Prisma/ORM, zod on the server | `database/sql` with plain SQL; validation in the handler, field errors in pt-BR |
| Centered text, cards with shadows | text left, values right; flat white groups (radius 22) on the gray paper, no shadows except the floating tab bar |
| English UI copy or "Submit"/"OK" | pt-BR verbs that say what happens ("Salvar", "Criar", "Convidar") |
| `DROP TABLE` + recreate to change the schema | a new additive migration with a documented rollback |
