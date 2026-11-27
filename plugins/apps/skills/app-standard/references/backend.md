# Backend standard

Reference files are in https://github.com/gucardona/gastos.app (local `C:\Users\Gustavo\dev\gastos.app`). Copy them and rename; the notes below say what each one does and what must stay.

## Layout

```text
cmd/<app>/main.go        config → db.Open → api.New → http.Server; graceful shutdown on SIGINT/SIGTERM; subcommands (e.g. `invite`)
internal/config/         Config struct + Load(getenv) — fails early on invalid values
internal/db/             schema.sql (frozen baseline), migrations/NNNN_*.sql, db.go (Open, migrations, pre-migration copy), backup
internal/api/            Server, Routes, middleware, one file per resource (+ its _test.go), httpx.go, auth.go, events.go, spa.go
internal/<domain>/       pure logic with its own tests (money, recurrence, billing…): no HTTP, no SQL when avoidable
internal/testutil/       TempDir that works on Windows with SQLite WAL
web/embed.go             //go:embed all:dist → web.Dist()
```

The layout is the one go.dev recommends: `cmd/` for binaries, `internal/` packaged by domain. No `pkg/`, `util` or `common` package, and no layered folders (`handlers/`, `services/`, `repositories/`): a package is named for what it owns.

One Go module named after the app (`module tarefas`). No framework, no ORM, no DI container. Dependencies: `modernc.org/sqlite` and `golang.org/x/crypto/bcrypt`; everything else is the standard library (SSE is plain `net/http` with `http.ResponseController` flushing, fed by the in-process bus in `internal/events`).

## Style

- Follow the [Uber Go Style Guide](https://github.com/uber-go/guide), checked by `golangci-lint` with the `.golangci.yml` from gastos (errcheck, godot, gosec, govet, revive, staticcheck, goimports). The lint reports only what a branch adds (`new-from-merge-base: origin/master`), so an older finding never blocks a PR.
- Uber rules that bite most: unexported package-level vars start with `_` (errors keep `err`); no parameter named after a builtin (`min`, `max`, `len`); handle every error or assign it to `_` with a comment saying why; exit only in `main`.
- Every package, and every top-level func, type, const and var, exported or not, has a doc comment per [Go Doc Comments](https://go.dev/doc/comment): it starts with the name, says what the thing does or returns in plain words, and ends with a period. Say what is true of the code; a comment that drifts from it is a bug.

## main.go

- `log := slog.New(slog.NewJSONHandler(os.Stdout, nil))`; log messages and keys in English ("listening", "shutting down").
- `var version = "dev"`, set by CI with `-ldflags "-X main.version=<sha7>"`.
- `import _ "time/tzdata"` so the timezone works on any server.
- `http.Server{ReadHeaderTimeout: 10 * time.Second}`; no WriteTimeout if there is SSE.
- Background jobs are `go x.Loop(ctx, time.Hour)` that run once right away.

## Config

Env vars prefixed with the app name in caps (`TAREFAS_ADDR`). Standard set, same defaults as gastos:

| Var | Default |
|---|---|
| `<APP>_ADDR` | `:<port>` (see ops.md for the port) |
| `<APP>_DB_PATH` | `./data/<app>.db` |
| `<APP>_BACKUP_DIR` / `<APP>_BACKUP_KEEP` | `./data/backups` / `14` |
| `<APP>_TZ` | `America/Sao_Paulo` |
| `<APP>_COOKIE_SECURE` | `true` (`false` only for local http) |
| `<APP>_DEV` | `false` (CORS for `localhost:5173`) |
| `<APP>_INVITE_CODE` | empty |

`Load(getenv func(string) string)` takes the getter so tests pass a map. Document every var in the README table.

## Server and routes

- `type Server struct { db *sql.DB; cfg config.Config; log *slog.Logger; now func() time.Time; … }`. `now` is injectable: tests freeze "today".
- Handlers have the signature `func(w http.ResponseWriter, r *http.Request) error`; `s.handle(h)` turns a returned error into the JSON error response.
- Route wrappers: `public := s.handle`, `user := requireUser(handle(h))`, and for resources under a shared container (gastos: a wallet) `wallet(minRole, h)` which checks membership and role (`roleReader < roleEditor < roleOwner`).
- Go 1.22 patterns: `mux.Handle("PUT /api/wallets/{walletID}/things/{id}", wallet(roleEditor, s.updateThing))`. Each resource file has its own `xxxRoutes(mux, wallet)`.
- Unknown `/api/*` → 404 JSON. Everything else → the SPA (`spa.go`: real files from dist, otherwise `index.html`).
- `GET /healthz` → `ok` (deploy and smoke test depend on it).
- Middleware chain, outermost first: `logRequests(recoverPanic(securityHeaders(devCORS(sameOriginWrites(mux)))))`.
  - securityHeaders: `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`, a strict CSP (self only), HSTS when cookies are secure, `Cache-Control: no-store` on `/api/`.
  - sameOriginWrites: refuses non-GET `/api` requests whose `Sec-Fetch-Site` is cross-site (CSRF barrier besides SameSite=Lax and JSON-only bodies).

## Errors (httpx.go)

```go
type apiError struct {
	Status  int               `json:"-"`
	Code    string            `json:"code"`    // validation | unauthenticated | forbidden | not_found | conflict | rate_limited | internal | <specific, e.g. duplicate>
	Message string            `json:"message"` // pt-BR, shown to the person as is
	Fields  map[string]string `json:"fields,omitempty"` // field → pt-BR message, lower case, no final period
}
```

Body: `{"error": {...}}`. Helpers: `errValidation(fields)` (400), `errBadRequest(msg)`, `errConflict(msg)` (409), `errNotFound`, `errForbidden`, `errUnauthenticated`. `sql.ErrNoRows` becomes 404 automatically; anything else is logged and answered as 500 "Erro interno". Collect several field errors with `fieldErrors.add(field, msg)` then `return fe.err()`.

A soft warning the person can override is a 409 with its own code plus an opt-in flag in the body (gastos: `code: "duplicate"`, retried with `"allowDuplicate": true`).

## Requests

- `decode(w, r, &in)`: requires `Content-Type: application/json` (415 otherwise), caps the body at 1 MB, `DisallowUnknownFields`.
- Input structs use pointers for optional/partial fields (`*string`, `*int64`); `null` clears.
- JSON is camelCase; ids are int64; money is `amountCents int64`; dates are `"YYYY-MM-DD"` strings; timestamps UTC `"YYYY-MM-DDTHH:MM:SSZ"`.
- Every write that touches more than one row goes through `s.inTx(ctx, func(tx *sql.Tx) error {...})` (BEGIN IMMEDIATE via the DSN). Functions that work in or out of a tx take a `querier`.
- After a write, notify the members (`s.mutated(r)` / `notifyWallet`) so other tabs and devices refresh over SSE (`GET /api/events`).
- Always check that a referenced id belongs to the same container (`WHERE id = ? AND wallet_id = ?`) before using it: 400 with a field error if not.

## Auth (auth.go: copy it)

- Users table with bcrypt hashes (max 72 bytes of password), sessions table with random tokens; cookie httpOnly, `SameSite=Lax`, `Secure` from config, 30 days, renewed after 15.
- Login rate limit per IP (10 per 15 min) and a dummy bcrypt compare for unknown e-mails (equal timing).
- Sign up: the first user is free; afterwards an invite code is required (single-use codes made by the `<app> invite [duração]` subcommand, or the fixed `<APP>_INVITE_CODE`).
- `GET /api/me` returns the user and what the shell needs to start.

## SQLite (db.go: copy it)

- DSN pragmas: `foreign_keys(1)`, `journal_mode(WAL)`, `busy_timeout(5000)`, `synchronous(NORMAL)`, `_txlock=immediate`.
- A new app starts with `schema.sql` as its baseline (`PRAGMA user_version = 1` for a new app) and an empty `migrations` list. Keep the runner from gastos: empty DB → schema + all migrations; baseline..latest → only the missing ones, one transaction each; any other version → refuse to start.
- Before the first pending migration of a non-empty DB, the runner writes `<db>.pre-v<N>.bak` (tmp + rename); failing to copy aborts the start.
- **A schema change is always a new file** `internal/db/migrations/NNNN_<what>.sql`, embedded and appended to `migrations`. It only adds (tables, nullable columns, indexes, triggers). Never edit `schema.sql` or a published migration. Avoid foreign keys on added columns when they would block `DROP COLUMN` in the rollback.
- Each migration file starts with a comment saying what it adds and that existing rows are untouched.
- Document its rollback (`sqlite3 … 'ALTER TABLE … DROP COLUMN …; PRAGMA user_version=N;'`) in the docs and add it to the rollback tests in `db_test.go`; bump the version assertions there.
- Money: integer cents. Shares/percentages: basis points (10000 = 100%). Dates: TEXT `YYYY-MM-DD`. Created/updated: TEXT UTC with `strftime('%Y-%m-%dT%H:%M:%SZ','now')`.
- Daily backup job into `<APP>_BACKUP_DIR`, keeping `<APP>_BACKUP_KEEP` copies.

## Go tests

- `internal/api/testutil_test.go`: `newTestApp(t)` opens a real SQLite in a temp dir, builds the Server with a fixed timezone and a test invite code, wraps `s.Routes(fakeSPA)` in `httptest.NewServer`. `app.register("Ana", "ana@example.com")` returns a `client` with its own cookie jar; `c.do(method, path, body, wantStatus, &out)` fails the test on an unexpected status and prints the body.
- Test users are Ana, Bia, Cleo (never real people's names).
- Freeze today with `app.s.now = func() time.Time { return time.Date(2026, 12, 5, 12, 0, 0, 0, loc) }`.
- Test names describe the behavior in English (`TestSameEntryHoursLaterBySamePersonPasses`); a comment above says the rule in one line.
- Run `gofmt -l .`, `go vet ./...`, `go test -race ./...` (on Windows with Git Bash: `export PATH="$PATH:/c/msys64/ucrt64/bin"` for the race detector's gcc).
