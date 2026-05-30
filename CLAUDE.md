# Diário de Bordo

App de diário de trabalho pessoal com vault local em markdown.
Interface web (React + Vite) que lê e escreve arquivos reais no sistema de arquivos via File System Access API.

Cada `.md` é um **nó**: a nota do dia é um tipo (`daily`), notas livres (`note`) são nós nomeados que se linkam entre si — modelo Obsidian-lite. Edição estilo Notion: o usuário nunca digita emoji nem `[[...]]` à mão.

> Documentação detalhada (arquitetura, fases, planos) em [`docs/`](./docs/). Roadmap em [`docs/README.md`](./docs/README.md); modelo de dados e decisões em [`docs/arquitetura.md`](./docs/arquitetura.md).

## Stack

- **Vite + React + TypeScript** — bundler e framework
- **Tailwind CSS v4** — estilização (config CSS-first em `src/styles/globals.css`)
- **TanStack Router** (file-based, `src/routes/`) + **TanStack Query** — rotas e cache async
- **Zustand** — estado de UI (`src/stores/`)
- **Biome** — lint e format
- **Vitest + React Testing Library** — testes (env happy-dom)
- **CodeMirror 6** — editor rico (`/` commands, `@` links, `#` projetos, chips)
- **gray-matter** — parse de frontmatter YAML (Obsidian Properties)
- **File System Access API** — leitura/escrita de arquivos locais (sem backend)
- Sem banco de dados — markdown é a fonte de verdade, JSON é índice derivado
- Gerenciador de pacotes: **pnpm**

## Comandos

```bash
pnpm dev          # dev server (localhost:5173)
pnpm build        # build de produção (tsc -b && vite build)
pnpm preview      # preview do build
pnpm lint         # biome check .
pnpm format       # biome format --write .
pnpm typecheck    # tsc -b --noEmit
pnpm test         # vitest (watch)
pnpm test:run     # vitest run (single)
pnpm test:ui      # vitest --ui
```

Rodar um teste só: `pnpm test:run src/lib/parser.test.ts` ou filtrar por nome `pnpm test -t "scheduled task"`.

Testes ficam ao lado do código (`*.test.ts` / `*.test.tsx`). Setup global em `src/test/setup.ts`.

## Estrutura do Vault (arquivos gerados pelo app)

```
vault/
├── daily/
│   └── YYYY-MM-DD/
│       ├── notes.md          # nó do dia (type: daily) — texto + tasks declaradas
│       ├── tasks.json        # IDs das tarefas scheduled/created nesse dia
│       └── agenda.json       # compromissos do dia (têm horário)
├── notes/
│   └── *.md                  # notas livres (type: note) — nós nomeados, linkáveis
├── tasks/
│   └── *.md                  # tasks-nó (type: task) — entidade forte; linha canônica + props
├── meta/
│   ├── tasks.json            # índice global de tasks (derivado dos .md)
│   ├── projects.json         # projetos e contextos (#tags)
│   ├── links.json            # grafo: nó → backlinks (derivado)
│   └── settings.json         # preferências do app
└── .vault.json               # versão do schema, última abertura
```

Cada `.md` pode ter **frontmatter** YAML (Obsidian Properties), injetado de forma **lazy** (só na 1ª escrita):

```markdown
---
id: 01HZX3QK7M8P                 # ULID estável — âncora de links, rename-safe
title: Reunião de planejamento
type: note                       # note | daily | task
tags: [trabalho, infra]
created: 2026-05-28
aliases: [planning]
---
```

**Frontmatter = autoral** (`id`, `title`, `type`, `tags`, `created`, `aliases`). **`meta/*.json` = derivado** (backlinks, índices). Backlink NUNCA vai no frontmatter.

## Arquitetura de Tasks

**Markdown é a fonte de verdade. JSON é sempre derivado — nunca editar manualmente.**

Sintaxe dentro dos `.md`:

```markdown
- [ ] Texto da tarefa 📅 2026-05-30           # task agendada
- [ ] Texto da tarefa 📅 2026-05-30 #projeto  # task com projeto
- [x] Tarefa concluída 📅 2026-05-29          # task feita

- [ ] 1:1 com gestor 🗓️ 2026-05-29 ⏰ 14:00 ⏱️ 30min  # agenda (tem horário)

[[outra-nota]]                                # link entre nós (wikilink)
```

Emojis como marcadores semânticos:
- `📅` → task com data de agendamento
- `🗓️ + ⏰` → agenda (compromisso com horário)
- `⏱️` → duração em minutos
- `#tag` → projeto/contexto
- `[[nome]]` → link para outro nó (resolve por `id` do frontmatter, exibe nome)

**Camada de entrada (UI):** emoji e `[[...]]` são formato de *disco* — nunca digitados à mão. No editor: `/` insere marcadores, `@` linka notas (insere `[[nome]]`), `#` autocompleta projetos. Render mostra chips/badges.

**Dois níveis de task (Fase 6):** a *task-linha* (`- [ ] ...` num daily/note) é leve, verdade na linha. A *task-nó* (`tasks/<título>.md`, `type: task`) é entidade forte — arquivo é a verdade, linkável/descritível. Promover é one-way (`usePromoteTask`): cria o nó e troca a linha por `- [[título]]`. Estado (4 status `[ ]`/`[/]`/`[x]`/`[-]` + `📅` + `#`) na **linha canônica** do corpo; **prioridade e esforço no frontmatter** (builder de ordem fixa, diff limpo). Detalhes em [`docs/fases/fase-6-task-node.md`](./docs/fases/fase-6-task-node.md).

## Fluxo do Parser

1. Ao abrir o vault, escaneia todos os `.md` sob `daily/`, `notes/` **e** `tasks/`
2. Por arquivo: separa frontmatter (gray-matter) do corpo; extrai tasks, agendas e `[[links]]`
3. Reconstrói `meta/tasks.json`, `projects.json` e `links.json` do zero (índices, não dado original)
4. Ao marcar task como feita na UI → app reescreve o `[ ]` como `[x]` no `.md` original, preservando o resto da linha **e o frontmatter byte a byte**
5. Ao salvar qualquer nó → re-escaneia só aquele arquivo e atualiza os índices

Reescrita é **por linha, nunca reserialização**: frontmatter só é lido, jamais re-serializado (reordenaria chaves e sujaria o diff).

## Convenções de Código

- TypeScript strict, sem `any`
- Componentes React funcionais com hooks
- Nenhum estado global complexo — Context API ou Zustand se necessário
- Arquivos de componente: `PascalCase.tsx`
- Utilitários e helpers: `camelCase.ts`
- Parser de markdown isolado em `src/lib/parser.ts`
- Frontmatter (gray-matter) isolado em `src/lib/frontmatter.ts`
- Reconstrução de índices em `src/lib/indexer.ts`
- File System Access em `src/lib/vault.ts` (ÚNICO lugar que toca `FileSystem*` direto)
- Tipos do vault em `src/types/vault.ts`

## Decisões de Design

- **Sem backend** — tudo roda no cliente via File System Access API (Chrome/Edge)
- **Markdown como verdade** — nunca sobrescrever o `.md` com dados do JSON
- **Frontmatter autoral, `meta/*.json` derivado** — frontmatter guarda o que o nó declara; backlinks/índices ficam no JSON
- **Bidirecional** — UI atualiza o `.md`, parser re-indexa; nunca o inverso
- **Link por `id`, exibe nome** — `[[nome]]` resolve via `id`+`aliases` do frontmatter (rename-safe), disco continua legível/Obsidian
- **Emoji e `[[...]]` nunca digitados à mão** — formato de disco; UI traduz de `/`, `@`, `#`
- **Handle do vault em IndexedDB** — re-permissão (`requestPermission`) a cada sessão
- **Git-friendly** — diffs legíveis, sem binários, vault pode ser um repositório separado
- **Compatível com Obsidian** — sintaxe de tasks (plugin Obsidian Tasks), wikilinks e Properties

## O que NÃO fazer

- Não usar `localStorage` ou `sessionStorage` (handle do vault vai em IndexedDB)
- Não criar estado de tasks fora do parser (verdade está no `.md`)
- Não usar Next.js (sem servidor, sem SSR necessário)
- Não modificar `meta/*.json` diretamente — sempre via parser/indexer
- Não colocar dado derivado (backlinks, índices) no frontmatter
- Não re-serializar frontmatter ao salvar — só ler; reescrever apenas linhas do corpo
- Não digitar emoji nem `[[...]]` à mão na UI — usar `/`, `@`, `#`
- Não usar `any` no TypeScript
