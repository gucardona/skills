---
name: dev-workflow
description: Use when Gustavo asks to build, change, fix or plan anything in one of his repositories ("quero fazer", "implementa", "corrige", "nova feature", "novo app", "abre uma PR"), when deciding which subagents to run and on which model, or when a change needs review before merge.
---

# Development workflow

## Overview

The main session is the **orchestrator**, on Opus. It talks to Gustavo, writes the design and the plan, and decides. Work that needs no judgment goes to cheaper agents, and every review comes from a fresh read-only agent that cannot edit. Gustavo approves two things: the design and the merge.

The process comes from superpowers (brainstorming, writing-plans, test-driven-development, verification-before-completion). The size of each change comes from ponytail. This skill adds who does each step, on which model, and how much review a change gets.

## Agents (plugin `workflow`)

| Agent | Model | Can edit | Use for |
|---|---|---|---|
| orchestrator (main session) | Opus | yes | talking to Gustavo, design, plan, rulings, commit and PR text, small changes |
| `workflow:implementer` | Sonnet | yes | one task of an approved plan, test first |
| `workflow:architect` | Opus | no | structure, boundaries, data, size |
| `workflow:security` | Opus | no | auth, input, secrets, supply chain |
| `workflow:qa` | Opus | no | test coverage, edge cases, flaky tests |
| `workflow:ux` | Sonnet | no | flows, pt-BR copy, states, accessibility |
| `workflow:scout` | Haiku | no | finding code when only the answer matters |
| `workflow:log-reader` | Haiku | no | long logs and CI output saved to a file |
| `workflow:doc-reader` | Haiku | no | one question answered from docs |

Implementers start on Sonnet. A task that fails twice on Sonnet goes to an implementer on Opus (`model: opus` in the Agent call), with the two failures in the prompt.

Write commit messages, PR titles and issue titles inline. A separate agent for them costs more than it saves.

## Sizing (say the size to Gustavo; Gustavo can change it)

| Size | Looks like | Process |
|---|---|---|
| Small | a typo, a copy change, a one-file fix with an obvious test | issue, then the orchestrator does it test first, runs the checks, opens the PR. No reviewer unless it touches auth, money, user data, migrations or CI: then `security` |
| Medium | a feature or a fix across a few files, no new data model | issue, short design doc approved by Gustavo, plan, implementers per task (or inline if the plan is short), then one review round with `architect` + `qa`, plus `security` and `ux` where they apply |
| Large | a new data model, a migration, a new screen or flow, a new external service, a new app | issue, full design doc reviewed by `architect` (and `security`, `ux` where they apply) before Gustavo approves it, plan, implementers per task, the same reviewers on the finished branch |

Reviewers run in parallel, in one message, each with a short prompt: the issue number, where the design or the diff is (save `git diff <base>..HEAD` to a file and give the path), and what to look at. Save long test output to a file and hand it to `log-reader` instead of reading it yourself.

## Gates

1. **Issue first.** Every change has an issue; the PR says `Closes #N`.
2. **Design approved** by Gustavo before any code (medium and large).
3. **Tests first**, and all checks green locally before the PR.
4. **Reviews answered.** Fix Critical and Important findings with a test that failed first. Put Minor ones in the PR body. A finding you decide not to fix is a ruling: say why in the PR.
5. **Merge only when Gustavo says so.** Merging to master deploys to production.

## Saving tokens without losing quality

- Reviewers and readers carry `omitClaudeMd: true` and only Read, Grep and Glob: they read what they need and nothing else.
- Give each agent the path to the design, plan or diff, never the whole conversation.
- Do not spawn an agent for what one Grep answers.
- No agent teams: they cost several times more than one orchestrator with subagents.
- The built-in Explore agent runs on the session's model. A plugin cannot change that. To run it on Haiku, copy [assets/Explore.md](assets/Explore.md) to `~/.claude/agents/Explore.md` once per machine, or use `workflow:scout`.
- Check what a session spent with `/usage`.

## Common mistakes

| Tempting | Instead |
|---|---|
| Reviewing your own diff and calling it reviewed | a fresh read-only reviewer, on the most capable model the role needs |
| Every reviewer on every small change | size the change first; small changes get none or `security` only |
| An implementer for a three-line fix | do it inline |
| Pasting a 2,000-line log into the conversation | save it to a file and send `log-reader` |
| Merging because CI is green | wait for Gustavo's explicit ok |
