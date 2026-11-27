# Testing standard

Reference: the tests in https://github.com/gucardona/gastos.app. Every change ships with its tests, written first. A test is named for the behavior it proves, in English.

## Levels

| Level | Tool | Covers | Does not cover |
|---|---|---|---|
| Go unit | `go test` | pure logic in `internal/<domain>` (money split, recurrence dates, bill dates, statement parsing) | HTTP, SQL |
| Go API | `go test` + `httptest` + real SQLite in a temp dir | every route: status, body, auth and role checks, validation messages, what is stored | the browser |
| Migrations | `go test` in `internal/db` | a fresh database, each upgrade from the baseline, each documented rollback | |
| Web unit and component | Vitest + Testing Library (jsdom) | `lib/` helpers, `ui/` components, each sheet and page: what it sends and what the person sees | the real server |
| Structure | Vitest (`structure.test.ts`, `styles/*.test.ts`) | import direction between `web/src` folders, CSS system rules | |
| E2E | Playwright against the real binary, desktop and Pixel 5 | the flows people do end to end: sign up, add, edit, split, settle, import | every edge case (those go one level down) |

## Go

- Table-driven tests where there are cases, as the Uber guide writes them: a `tests` slice, `tt` in the loop, `give` and `want` fields, `t.Run(tt.name, ...)`. Keep the table simple: when a case needs its own setup or its own assertions, it is its own test.
- `t.Parallel()` where the test shares no state.
- API tests go through `newTestApp(t)` and `app.register("Ana", ...)`; never call handlers directly. Test users are Ana, Bia and Cleo, never real people.
- Freeze today through the server's `now` field. Never depend on the real date.
- Assert the error message the person would see when it matters, not only the status code.

## Web

- Query by role, then label, then text (`getByRole("button", { name: "Salvar" })`). Never by class or test id.
- Act with `userEvent`, never `fireEvent`.
- For a form: assert the exact request (URL, method, body) and what the person sees after (toast, sheet closed, error under the field).
- Fixtures from `test/fixtures.tsx`: `renderApp`, `appCtx`, `mockFetch`, `bodyOf`.

## E2E

- `getByRole` and visible labels, web-first assertions (`await expect(locator).toBeVisible()`), never fixed sleeps.
- Each test signs up its own user, so tests never share data.
- Dates relative to today, chosen so the outcome holds on every day of the month.
- External services are local fakes started by the Playwright config. A real key never enters a test.

## Never

- A test that passes before the code it tests exists.
- Weakening a test to make it pass.
- Snapshot tests of whole pages.
- Real network calls, real API keys, real people's data.
