[English](README.md) · **Português**

# skills

Skills e agentes pessoais do Gustavo para o Claude Code (e outros agentes que seguem o padrão [Agent Skills](https://agentskills.io/specification)), distribuídos como um marketplace de plugins.

## Plugins

| Plugin | O que tem | Para quê |
|---|---|---|
| `workflow` | a skill `dev-workflow`; os agentes `architect`, `security`, `qa`, `ux` (revisores que só leem), `implementer`, `scout`, `log-reader`, `doc-reader` | Como o trabalho é feito: um orquestrador no Opus, revisores novos que só leem, implementadores no Sonnet e leitores no Haiku, na medida do tamanho da mudança. Instala junto superpowers, ponytail, humanizer e i-have-adhd. |
| `apps` | a skill `app-standard` | O padrão dos apps web do Gustavo, com o [gastos.app](https://github.com/gucardona/gastos.app) como referência: stack, estrutura, UI, UX, textos, testes, segurança, CI/CD e deploy. Entra sozinha ao criar ou mudar um desses apps. Instala o `workflow` junto. |

## Instalar

No Claude Code:

```text
/plugin marketplace add gucardona/skills
/plugin install apps@gucardona-skills
```

Instalar o `apps` instala também o `workflow` e as dependências dele. O repositório é privado, então o Claude Code usa as credenciais do git da máquina. Se o `add` falhar, rode `gh auth login` e `gh auth setup-git` uma vez.

Para o agente Explore embutido também rodar no Haiku, copie `plugins/workflow/skills/dev-workflow/assets/Explore.md` para `~/.claude/agents/Explore.md`.

## Atualizar

```text
/plugin marketplace update gucardona-skills
```

## Contribuir

Como o repositório é organizado, e as regras para escrever uma skill ou um agente, estão no [AGENTS.md](AGENTS.md) (em inglês). Antes de abrir um PR:

```bash
npm test
npm run validate
```
