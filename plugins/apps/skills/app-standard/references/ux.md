# UX and copy standard

The reference products are Apple's own apps: few elements, a lot of space, a large title, grouped lists, controls that explain themselves. The apps are for two people at home (Gustavo and Rafa) on their phones first, then on a desktop.

## Principles

1. **One path to each thing.** No setting in two places, no duplicated entry point. If a feature needs a second place, it links to the first ("Em Cartões de crédito ›").
2. **The number is the protagonist.** What the person came to know (how much is left, whose turn it is) is the biggest thing on the screen.
3. **No instructions needed.** Every control says what it does. When a screen needs a sentence of help, it is one short `.sub` line under the title.
4. **Quick entry.** The main creation action is always one tap away (the "+"; `N` on desktop). Its sheet opens with focus on the first field and sensible defaults filled (today, the person's own default, the most common choice).
5. **Choices are visual, not typed.** Categories are a grid, dates a calendar with "Hoje"/"Ontem", lists are rows to tap. A keyboard appears only for text and numbers (`inputMode="numeric"` for amounts).
6. **Each person has their own defaults** when it helps (gastos: the method new entries start with). A personal setting changes only for that person and says so.
7. **Do not nag.** A warning appears only when it is probably right (gastos' duplicate check: the same person within 15 min, or the other member the same day), and always offers the way through ("Lançar mesmo assim").

## Screens

- Page: large title (the period or the screen name), optional ‹ › to move between periods, then content in sections (`.sec` with an `h2` and an optional `.sub`).
- Lists group by day or by section; each row: emoji/icon at the left, description and a muted meta line, the value at the right. Tapping a row opens its edit sheet. Things still to come are dimmed and tagged "previsto".
- Search is one box that finds by everything visible (description, amount in any format, date, category, person, method), accent- and case-insensitive.
- Filters are a `Segmented`; the totals stay those of the whole period.
- Settings (Ajustes): short lists of rows with a chevron, each to its own screen; "Sair" last, in red. Archived items hide behind a chip "Mostrar arquivadas (N)".

## Forms (sheets)

- Header: the title ("Nova tarefa", "Editar tarefa") or a `Segmented` for the kind, and a ✕ "Fechar" at the right.
- Body: a `.preview` when the item has an icon and a name; then grouped rows (label left, value or input right); switches for on/off.
- Footer: one full-width primary button named by its action ("Salvar", "Criar", "Convidar"); "Salvar e lançar outro" as ghost when people enter several in a row; for an existing item, "Arquivar" (reversible) before "Excluir X" (ConfirmButton) at the end.
- While saving the button is disabled and reads "Salvando…". On success: toast and close (or clear and refocus for "lançar outro").
- Validation happens in the browser for what it can know (empty amount, end before start) and on the server for the rest; each error sits under its field, the others in the general line.

## Copy (pt-BR)

- Sentence case, plain verbs, no exclamation marks, no emojis in system text, no jargon ("forma de pagamento", not "método"). Second person implicit ("Escolha uma categoria."), "você" only when needed.
- Buttons: the verb of what happens: Salvar, Criar, Convidar, Arquivar, Restaurar, Excluir cartão, Confirmar exclusão, Tentar de novo, Desfazer, Lançar mesmo assim. Never OK, Enviar, Submit.
- Toasts repeat the action as done, noun first, agreeing in gender: "Lançamento salvo", "Cartão criado", "Forma de pagamento arquivada", "Recorrência pausada". With undo: "Lançamento excluído · Desfazer". When the result is not obvious, say where it went: "Lançado na fatura de dezembro".
- Errors say what happened and what to do, never apologize: "Sem conexão. Tente de novo.", "Algo deu errado. Tente de novo.", "Escolha uma categoria.", "A data final precisa ser no dia do início ou depois." Server field messages are lower case without a period ("use entre 0 e 100%"); the client capitalizes and adds the period when it shows them in the general line.
- Empty states invite the next step: "Nenhum lançamento neste mês." + "Novo lançamento"; for a filter: "Nenhum lançamento corresponde ao filtro."; for a new list: what the thing is for, in one sentence.
- Money: `R$ 1.234,56` (`Intl` pt-BR), sign before the currency for outflows in lists ("−R$ 54,62"), incomes with "+" in `--income`. Dates: "Hoje", "Ontem", "segunda, 24 de novembro"; months capitalized as titles ("Novembro").
- People by first name, in sentences that do not need a gendered article or adjective for them ("Bia já lançou um igual neste dia.", "Vez de Rafa", "Rafa deve R$ 120,00 a você"); never infer anyone's gender from a name.
- `aria-label`s are pt-BR and specific: "Nome do cartão", "Fechar", "Mês anterior", "Dispensar aviso".

## Accessibility (part of done, not a polish pass)

- Every control is reachable and visible with the keyboard; focus rings follow the shape (see frontend.md).
- Targets ≥44px; contrast AA in both themes; color never the only signal (over-budget also says it in text).
- Each list row is a single control with a clear name; sheets trap focus and close with Esc; a picker moves focus to its title.
- Toasts live in a `role="status"` polite region (one inside each open sheet, since the modal makes the page inert).
- `prefers-reduced-motion` turns off every animation.
