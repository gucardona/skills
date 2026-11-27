# Frontend standard

Reference: `web/` in https://github.com/gucardona/gastos.app (local `C:\Users\Gustavo\dev\gastos.app\web`). Copy `tokens.css`, `styles.css`, the components listed below, `api/client.ts`, `hooks/useAction.ts`, `lib/theme.ts`, `test/setup.ts`, the configs; then delete what is finance-only.

## Stack and configs

- `package.json` scripts: `dev` (vite), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `build` (`tsc --noEmit && vite build` + `dist/.gitkeep`), `e2e` (wipe `e2e-data`, `playwright test`), `lint` (`biome lint .`).
- Dependencies: `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `@fontsource-variable/geist`. Nothing else at runtime unless Gustavo agrees. Dev: vite, `@vitejs/plugin-react`, typescript, vitest, jsdom, `@testing-library/react`, `@testing-library/user-event`, `@playwright/test`, `@biomejs/biome`.
- `vite.config.ts`: proxy `/api` → `http://127.0.0.1:<port>` (one origin, cookies work); vitest env jsdom, `src/**/*.test.{ts,tsx}`, setup `src/test/setup.ts` (polyfills `HTMLDialogElement.showModal/close`, cleanup).
- `tsconfig.json`: strict, `noUnusedLocals`, `noUnusedParameters`, `jsx: react-jsx`, bundler resolution.
- `biome.jsonc`: linter only (formatter off), recommended preset, `noNonNullAssertion` off, `useSemanticElements` off.
- `index.html`: `lang="pt-BR"`, `viewport-fit=cover`, `color-scheme` light dark, two `theme-color` metas (#F2F3F4 / #0F1113), manifest, svg icon, apple-touch-icon, `<title><app></title>` in lower case.
- `public/manifest.webmanifest`: name/short_name = app slug, `lang: pt-BR`, `display: standalone`, background/theme `#F2F3F4`, icons svg + 192 + 512 + maskable.

## Layout

```text
web/src/
  main.tsx          font import, styles.css, applyStoredTheme(), QueryClient (no retry on 4xx, no refetch on focus), BrowserRouter
  App.tsx           <Routes>: /login outside; everything else inside <Shell/>; unknown → Navigate "/"
  Shell.tsx         loads me + base data, redirects to /login on 401, builds the context, renders Sidebar + main + TabBar, ToastProvider, ErrorBoundary, the global "+" sheet, the N shortcut
  context.ts        AppCtx + useApp()
  api/              client.ts (fetch wrapper, ApiError), queries.ts (useQuery hooks), types.ts (mirrors the Go DTOs)
  components/       house components (below), each with its .test.tsx
  hooks/useAction.ts
  lib/              pure helpers with tests (dates, money, search, theme…)
  pages/            one file per destination; settings/ holds one Section per Ajustes screen
  styles.css        all rules, grouped by area with a /* ---------- area ---------- */ comment
  styles/tokens.css colors, font, radii
  styles/*.test.ts  tests that read the CSS and pin system rules (alignment, focus, tap targets, small phones)
  test/             setup.ts, fixtures.tsx (appCtx, renderApp, mockFetch, bodyOf, sample data)
```

Routes are pt-BR slugs (`/lancamentos`, `/ajustes/:section?`).

## Tokens (copy exactly)

```css
:root {
  --paper: #F2F3F4; --surface: #FFFFFF; --ink: #14181B; --muted: #5E696F; --line: #ECEEEF;
  --accent: #0E6577; --on-accent: #FFFFFF; --income: #187A4C; --over: #C2412D;
  --scrim: rgba(20, 24, 27, 0.28); --tick: #B9C0C4; --tick-future: #D9DDE0;
  --shadow: rgba(20, 24, 27, 0.12); --knob: #FFFFFF;
  --font: "Geist Variable", system-ui, sans-serif; --ui: var(--font);
  --radius-group: 22px; --radius-control: 12px; color-scheme: light;
}
/* dark: same roles. Repeated under @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} } and :root[data-theme="dark"] {…} */
  --paper: #0F1113; --surface: #191C1F; --ink: #F3F4F5; --muted: #8A949A; --line: #23272A;
  --accent: #6CC4D6; --on-accent: #0F1113; --income: #5BD08D; --over: #FF8A78;
  --scrim: rgba(0, 0, 0, 0.55); --tick: #5A646A; --tick-future: #2A2F33; --shadow: rgba(0, 0, 0, 0.5); --knob: #F3F4F5; color-scheme: dark;
```

Roles: `--accent` only for actions and the active item; `--over` for errors, overspending and destructive actions; `--income` for money coming in. Money going out uses normal ink (not red). Never a hard-coded color in a component; derive tints with `color-mix(in srgb, var(--ink) 8%, transparent)`.

Theme: `lib/theme.ts` stores `light`/`dark` in localStorage (try/catch), sets `data-theme` on `<html>`; "system" removes both. Ajustes → Aparência is a `Segmented` Automático | Claro | Escuro.

## Base look (styles.css)

- `body`: background `--paper`, 15px/1.45 Geist, `font-variant-numeric: tabular-nums`. Values use `.num`.
- One family, weights 400/500/600/700. Big number 44px/700 tracking −0.045em (cents and "R$" smaller and muted); page title `clamp(22px, 7vw, 32px)` 700; section `h2` 16px/600; secondary 13px muted.
- Flat white blocks on gray paper: `.list-group` (surface, radius 22, padding 16), no borders, no shadows. Only the floating tab bar, the FAB and the toast have a shadow.
- `.main`: padding top `20px + safe-area-inset-top`, sides 16px, bottom 112px (room for the tab bar), max width 980px. ≥900px: grid `248px 1fr`, padding `36px 40px 64px`, `.cols` two columns with a 56px gap.
- Buttons: `.btn` (accent fill, radius 12, padding 12×16, 600), `.btn.ghost` (line border, ink), `.btn.danger` (over border and text), `.btn.full`. Chips `.chip` are pills.
- Text left, values right. Centered only in: empty states, the icon preview, the big amount input, grid tiles, picker titles.
- Every tap target ≥44px (grow the hit area with `::after` when the look must stay small). Focus: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`; rows get a rounded ring with offset 4px and hide the dividers next to it.
- Motion only in answer to an action (sheet rises 0.18s, switch 0.15s, toast), all off under `prefers-reduced-motion`.
- Phones: sheets use `92dvh` with a `92vh` fallback; long labels ellipsize or wrap with `overflow-wrap: anywhere`.

## Navigation

- `components/nav.ts`: `navItems(...)` is the single list of destinations (3–5, each `{to, label, icon, end}`), used by both bars.
- Phone (`TabBar`): fixed floating pill (`.tabbar-pill`, 58px tall, translucent) with icon + label per destination, and the round `.fab` "+" (58px, accent) apart on the right for the main creation action. Pending counters are a `.badge` with the number only (99+).
- Desktop ≥900px (`Sidebar`): 248px sticky column, app/container name at the top, the destinations, the main action as a full-width `.btn`, and the profile/avatar at the bottom.
- Ajustes is never a tab: it opens from the avatar (top right on phones, sidebar bottom on desktop). It is a list of rows with chevrons, each to its own screen (`/ajustes/<section>`); on desktop master-detail.
- Icons: `components/Icon.tsx` inline SVG strokes (22px, stroke 1.7). Emojis are used as user-chosen icons for data (categories, methods).

## Components (use these; do not make look-alikes)

| Component | Use |
|---|---|
| `Sheet({open, onClose, label})` | every create/edit form. Native `<dialog>` with `showModal` (focus trap, Esc), grab bar, closes only by its ✕ or Esc; bottom sheet on phones, 440px right panel on desktop. `data-autofocus` marks the first field. Renders its own `ToastView` |
| `ListGroup` / `ListRow({label, value, icon, onClick, to, chevron, trailing, disabled})` | settings lists and form fields. A row with `onClick` is one button; with `to` a link; otherwise a plain row holding `trailing` (a Switch, an input) |
| `.field-row` | a single labeled input in a sheet (name fields) |
| `Segmented({label, value, onChange, options})` | 2–4 exclusive choices (Gasto \| Entrada, Tudo \| Gastos \| Entradas, Automático \| Claro \| Escuro). `role="group"`, buttons with `aria-pressed` |
| `Switch({checked, onChange, label})` | on/off settings that apply at once. `role="switch"` button |
| `PickerView({title, onBack})` + `OptionList`, `CategoryGrid`, `DatePicker` | a choice that takes over the sheet (tap the row → pick → back). Never a native `<select>` for these |
| `EmojiPicker`, `ColorSwatches` | choosing an icon or a color for a user-made item; show a `.preview` of icon + name above |
| `ConfirmButton({label, confirmLabel, onConfirm})` | destructive or irreversible actions: first click turns into "Confirmar …", second separate click runs it; blur or Esc cancels |
| `useToast()` | one short message after every write: `toast("Tarefa salva")`, or `toast("Tarefa excluída", { action: undo(...) })`. 4s, 8s with an action, pauses on hover/focus |
| `ErrorBoundary` | wraps each screen; "Algo deu errado ao mostrar esta tela." + "Tentar de novo" + "Voltar ao início" |
| `.empty` | empty state: one sentence of what to do + the button that does it (only for editors) |
| `.skeleton` | loading: a couple of gray bars, never a spinner |

## Data

- `api/client.ts`: `api.get/post/put/patch/del/upload`, all under `/api`, `credentials: "include"`; non-OK → `ApiError(status, code, message, fields)`; `generalError(e, shownFields)` builds the general error line from fields the form has no place for; `isUnauthenticated(e)`.
- `api/queries.ts`: one hook per resource; keys for container data start with `["wallet", id, …]` (or `["<container>", id, …]`) so `useRefresh()(id)` invalidates everything; base lists use `staleTime: 60_000`.
- Live updates: `useEvents` listens to `/api/events` (SSE) and invalidates queries when another tab, device or member writes.
- Writes in sheets go through `useAction()`: `const { run, busy, error } = useAction(); run(() => api.put(...), "Tarefa salva")` — tracks busy, shows the error, refreshes, toasts. Multi-field forms show field errors under their field (`aria-invalid` + `aria-describedby`) and the rest with `generalError`.
- Undo of a delete: `useUndo()` returns the toast action that recreates the item.
- Local state of the shell (selected container, theme) in localStorage wrapped in try/catch; shareable state (month, filters) in the URL (`?m=2026-11`).
- Types in `api/types.ts` mirror the Go DTOs field by field (camelCase, `number | null`).

## Frontend tests

- Vitest + Testing Library; query by role and accessible name (`getByRole("button", { name: "Salvar" })`, `getByLabelText("Nome do cartão")`), never by class or test id.
- `test/fixtures.tsx`: `appCtx(over)`, `renderApp(ui, ctx)` (QueryClient + MemoryRouter + context + toast spy), `mockFetch(fn)`, `bodyOf(fetch, n)`, sample data (Ana/Bia, a few items).
- Assert the request a form sends (URL, method, exact body) and what the person sees after (toast text, sheet closed, error shown).
- Each test name says the behavior in English ("a new transaction starts with the payment method I chose as default").
- CSS rule tests in `styles/*.test.ts` pin the system rules (alignment whitelist, focus rings, 44px targets, dvh). Copy them and extend when adding a rule.
