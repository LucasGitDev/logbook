# Diário de Bordo

App de diário de trabalho pessoal com vault local em markdown.
Interface web (React + Vite) que lê e escreve arquivos reais no sistema de arquivos via File System Access API.

## Stack

- **Vite + React + TypeScript** — bundler e framework
- **Tailwind CSS** — estilização
- **File System Access API** — leitura/escrita de arquivos locais (sem backend)
- Sem banco de dados — markdown é a fonte de verdade, JSON é índice derivado

## Comandos

```bash
npm run dev      # dev server (localhost:5173)
npm run build    # build de produção
npm run preview  # preview do build
npm run lint     # ESLint
npm run typecheck # tsc --noEmit
```

## Estrutura do Vault (arquivos gerados pelo app)

```
vault/
├── daily/
│   └── YYYY-MM-DD/
│       ├── notes.md          # fonte de verdade do dia (texto + tasks declaradas)
│       ├── tasks.json        # IDs das tarefas scheduled/created nesse dia
│       └── agenda.json       # compromissos do dia (têm horário)
├── meta/
│   ├── tasks.json            # índice global de tasks (derivado dos .md)
│   ├── projects.json         # projetos e contextos (#tags)
│   └── settings.json         # preferências do app
└── .vault.json               # versão do schema, última abertura
```

## Arquitetura de Tasks

**Markdown é a fonte de verdade. JSON é sempre derivado — nunca editar manualmente.**

Sintaxe dentro dos `.md`:

```markdown
- [ ] Texto da tarefa 📅 2026-05-30           # task agendada
- [ ] Texto da tarefa 📅 2026-05-30 #projeto  # task com projeto
- [x] Tarefa concluída 📅 2026-05-29          # task feita

- [ ] 1:1 com gestor 🗓️ 2026-05-29 ⏰ 14:00 ⏱️ 30min  # agenda (tem horário)
```

Emojis como marcadores semânticos:
- `📅` → task com data de agendamento
- `🗓️ + ⏰` → agenda (compromisso com horário)
- `⏱️` → duração em minutos
- `#tag` → projeto/contexto

## Fluxo do Parser

1. Ao abrir o vault, escaneia todos os `notes.md`
2. Extrai tasks e agendas pela sintaxe acima
3. Reconstrói `meta/tasks.json` do zero (índice, não dado original)
4. Ao marcar task como feita na UI → app reescreve o `[ ]` como `[x]` no `.md` original
5. Ao salvar qualquer nota → re-escaneia só aquele arquivo e atualiza o índice

## Convenções de Código

- TypeScript strict, sem `any`
- Componentes React funcionais com hooks
- Nenhum estado global complexo — Context API ou Zustand se necessário
- Arquivos de componente: `PascalCase.tsx`
- Utilitários e helpers: `camelCase.ts`
- Parser de markdown isolado em `src/lib/parser.ts`
- File System Access em `src/lib/vault.ts`
- Tipos do vault em `src/types/vault.ts`

## Decisões de Design

- **Sem backend** — tudo roda no cliente via File System Access API (Chrome/Edge)
- **Markdown como verdade** — nunca sobrescrever o `.md` com dados do JSON
- **Bidirecional** — UI atualiza o `.md`, parser re-indexa; nunca o inverso
- **Git-friendly** — diffs legíveis, sem binários, vault pode ser um repositório separado
- **Compatível com Obsidian** — sintaxe de tasks segue o padrão do plugin Obsidian Tasks

## O que NÃO fazer

- Não usar `localStorage` ou `sessionStorage`
- Não criar estado de tasks fora do parser (verdade está no `.md`)
- Não usar Next.js (sem servidor, sem SSR necessário)
- Não modificar `meta/tasks.json` diretamente — sempre via parser
- Não usar `any` no TypeScript
