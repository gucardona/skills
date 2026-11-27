**English** · [Português](README.pt-BR.md)

# skills

Gustavo's personal skills and agents for Claude Code (and other agents that follow the [Agent Skills](https://agentskills.io/specification) spec), published as a plugin marketplace.

## Plugins

| Plugin | What it has | What for |
|---|---|---|
| `workflow` | the `dev-workflow` skill; agents `architect`, `security`, `qa`, `ux` (read-only reviewers), `implementer`, `scout`, `log-reader`, `doc-reader` | How work is done: an Opus orchestrator, fresh read-only reviewers, Sonnet implementers and Haiku readers, sized by the change. Installs superpowers, ponytail, humanizer and i-have-adhd with it. |
| `apps` | the `app-standard` skill | The standard of Gustavo's web apps, with [gastos.app](https://github.com/gucardona/gastos.app) as the reference: stack, layout, UI, UX, copy, tests, security, CI/CD and deploy. Loads by itself when creating or changing one of those apps. Installs `workflow` with it. |

## Install

In Claude Code:

```text
/plugin marketplace add gucardona/skills
/plugin install apps@gucardona-skills
```

Installing `apps` also installs `workflow` and its dependencies. The repository is private, so Claude Code uses the machine's git credentials. If `add` fails, run `gh auth login` and `gh auth setup-git` once.

To run the built-in Explore agent on Haiku as well, copy `plugins/workflow/skills/dev-workflow/assets/Explore.md` to `~/.claude/agents/Explore.md`.

## Update

```text
/plugin marketplace update gucardona-skills
```

## Contributing

How the repository is organized, and the rules for writing a skill or an agent, are in [AGENTS.md](AGENTS.md). Before opening a PR:

```bash
npm test
npm run validate
```
