# AGENTS.md

Gustavo's personal skills and agents, published as a Claude Code plugin marketplace. Skills follow the Agent Skills spec (https://agentskills.io/specification), so other agents can use them too.

## Default plugins (every project of Gustavo's)

Every project, this one included, works with two plugins on:

- **superpowers** (`superpowers@claude-plugins-official`): the process. Brainstorm into a design doc before building, write a plan, test first, debug from the root cause, verify before saying done, review before merging. Use its skills whenever one applies.
- **ponytail** (`ponytail@ponytail`, from https://github.com/dietrichgebert/ponytail): the size of the change. The smallest complete change, no code nobody asked for, and a short note on what was skipped.

superpowers decides how the work is done; ponytail decides how much code it takes. When they pull apart, keep superpowers' gates (design doc, tests, verification) and ponytail's size (no extra code, no extra files).

Each project declares both in its committed `.claude/settings.json`, so a fresh clone asks to install them:

```json
{
  "extraKnownMarketplaces": {
    "ponytail": { "source": { "source": "git", "url": "https://github.com/dietrichgebert/ponytail.git" } }
  },
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true,
    "ponytail@ponytail": true
  }
}
```

## Layout

```text
.claude-plugin/marketplace.json     the catalog: one entry per plugin (name, source "./plugins/<name>", description)
plugins/<plugin>/
  .claude-plugin/plugin.json        name (equal to the marketplace entry), version, description, author, dependencies
  agents/<agent-name>.md            subagents the plugin ships (frontmatter: name = file name, description, tools, model…)
  skills/<skill-name>/
    SKILL.md                        frontmatter + the instructions an agent reads first
    references/*.md                 detail loaded on demand, linked from SKILL.md
    scripts/                        executable helpers the skill tells the agent to run (optional)
    assets/                         templates and static files (optional)
scripts/validate.mjs                checks everything below; scripts/validate.test.mjs tests the checker
```

Plugins group skills and agents by area: `workflow` holds the development process and its agents, `apps` the standard of Gustavo's web apps (and depends on `workflow`). A dependency on a plugin from another marketplace needs that marketplace in `allowCrossMarketplaceDependenciesOn` in `marketplace.json`. Never write the apps' domain name in this repo: it may change, and the skills read it from the gastos.app repo. Make a new plugin only for a new area; otherwise add the skill to the plugin it belongs to.

## Writing or changing an agent

- `name` equal to the file name; `description` starts with "Use when", "Use to" or "Use for" and says when the orchestrator should call it.
- Reviewers and readers are read-only (`tools: Read, Grep, Glob`), set `omitClaudeMd: true` and a `maxTurns`, and report findings only.
- `model` is `opus`, `sonnet`, `haiku` or `inherit`. Plugin agents ignore `hooks`, `mcpServers` and `permissionMode`; the validator rejects them.

## Writing or changing a skill

- Use the `superpowers:writing-skills` process: run a scenario without the skill first and note what goes wrong, write the skill against those failures, run it again with the skill, close the gaps it reveals.
- `name`: lowercase letters, digits and single hyphens, at most 64 characters, equal to the folder name.
- `description`: starts with "Use when", says only when to load the skill (triggers, symptoms, the words Gustavo uses, in pt-BR too), never a summary of the steps; at most 1024 characters.
- `SKILL.md` under 500 lines: overview, quick reference, the rules, common mistakes. Detail goes in `references/`, linked with a relative Markdown link, one level deep (references do not send the reader to other references).
- Skill text in English; the pt-BR words and copy it teaches stay in pt-BR.
- Concrete values (hex colors, commands, paths, file names) beat advice. Point to the reference implementation instead of pasting large code that will drift.
- Refer to people by name, never with gendered pronouns. No secrets, tokens, keys or server addresses beyond the public domain names.
- Bump `version` in the plugin's `plugin.json` when a skill in it changes (patch for wording, minor for new guidance or a new skill).

## Checks

```bash
npm test            # the validator's own tests
npm run validate    # marketplace, plugin manifests, every SKILL.md and its links
```

Both run in CI on every push and PR. With the Claude Code CLI, `claude plugin validate .` checks the marketplace too.

## Git

- Every change starts from an issue; the PR says `Closes #N`.
- Branch from `main` (`feat/<skill>`, `fix/<skill>`), Conventional Commits in English (`feat(app-standard): …`) with `Refs #N`, a PR with what changes and how it was tested, merge after green CI and Gustavo's ok.
- Everything in this repo is in English except the pt-BR words and copy the skills teach, and `README.pt-BR.md`.
- End commits with the Co-Authored-By trailer the harness gives.
