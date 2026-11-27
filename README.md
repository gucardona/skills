# skills

Skills pessoais do Gustavo para o Claude Code (e outros agentes que seguem o padrão [Agent Skills](https://agentskills.io/specification)), distribuídas como um marketplace de plugins.

## Skills

| Plugin | Skill | Para quê |
|---|---|---|
| `gupa` | `app-standard` | O padrão dos apps `*.gupa.dev`, com o [gastos.app](https://github.com/gucardona/gastos.app) como referência: stack, estrutura, UI, UX, textos, testes, CI/CD e deploy. Entra sozinha ao criar ou mudar um desses apps. |

## Instalar

No Claude Code:

```text
/plugin marketplace add gucardona/skills
/plugin install gupa@gucardona-skills
```

O repositório é privado: o Claude Code usa as credenciais do git da máquina. Se o `add` falhar, rode `gh auth login` e `gh auth setup-git` uma vez.

## Atualizar

```text
/plugin marketplace update gucardona-skills
```

## Contribuir

Como o repositório é organizado e as regras para escrever uma skill estão em [AGENTS.md](AGENTS.md). Antes de abrir um PR:

```bash
npm test
npm run validate
```
