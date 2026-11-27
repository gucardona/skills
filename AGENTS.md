# AGENTS.md

Gustavo's personal skills, published as a Claude Code plugin marketplace. Skills follow the Agent Skills spec (https://agentskills.io/specification), so other agents can use them too.

## Layout

```text
.claude-plugin/marketplace.json     the catalog: one entry per plugin (name, source "./plugins/<name>", description)
plugins/<plugin>/
  .claude-plugin/plugin.json        name (equal to the marketplace entry), version, description, author
  skills/<skill-name>/
    SKILL.md                        frontmatter + the instructions an agent reads first
    references/*.md                 detail loaded on demand, linked from SKILL.md
    scripts/                        executable helpers the skill tells the agent to run (optional)
    assets/                         templates and static files (optional)
scripts/validate.mjs                checks everything below; scripts/validate.test.mjs tests the checker
```

Plugins group skills by area: `apps` holds the standard of Gustavo's web apps. Never write the apps' domain name in this repo: it may change, and the skills read it from the gastos.app repo. Make a new plugin only for a new area; otherwise add the skill to the plugin it belongs to.

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

- Branch from `main` (`feat/<skill>`, `fix/<skill>`), Conventional Commits in pt-BR (`feat(app-standard): …`), PR with what changes and how it was tested, merge after green CI and Gustavo's ok.
- End commits with the Co-Authored-By trailer the harness gives.
