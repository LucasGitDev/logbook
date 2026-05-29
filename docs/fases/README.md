# Fases

O trabalho é dividido em 5 fases sequenciais. Cada fase entrega algo usável de ponta a ponta e desbloqueia a próxima.

```
Fase 1 ──▶ Fase 2 ──▶ Fase 2.5 ──▶ Fase 3 ──▶ Fase 4 ──▶ Fase 5
Vault &    Daily       UI/UX        Notas &     Task        Polimento
Parser     View        (Live Prev)  Links       System
```

| Fase | Tema | Objetivo central | Entregável | Status |
|---|---|---|---|---|
| [**1**](./fase-1-vault-parser.md) | Vault & Parser | Ler/escrever arquivos reais; parsear frontmatter, sintaxe e links | Abrir vault, criar nota do dia, salvar `.md`, ver tasks/agenda/links parseados | ✅ Concluída |
| [**2**](./fase-2-daily-view.md) | Daily View | A tela principal com editor rico | Editor `/`+`@`, ver tasks, marcar como feita (atualiza o `.md`), navegar dias | ✅ Concluída |
| [**2.5**](./fase-2.5-ui-ux.md) | Redefinição UI/UX | Identidade dev + editor Live Preview | 2 temas, render markdown ao vivo (Notion-like), statusbar/topbar, `⌘K`, modo foco | ✅ Concluída |
| [**3**](./fase-3-notas-links.md) | Notas & Links | Notas livres e grafo | Criar notas livres, `[[links]]` via `@`, backlinks, criar nota a partir de link | ⬜ A fazer |
| [**4**](./fase-4-task-system.md) | Task System | Tasks encadeadas entre dias | Criar task hoje → aparece no dia agendado; inbox; filtro por projeto; visão semanal | ⬜ A fazer |
| [**5**](./fase-5-polimento.md) | Polimento | UX, mobile e git flow | App pronto pra uso diário: tema, responsivo, git, atalhos | ⬜ A fazer |

## Dependências entre objetivos

- **Fase 1 pré-requisito de tudo.** Sem `vault.ts` (I/O) e `parser.ts` (frontmatter + sintaxe → dados) não há o que renderizar.
- **Seleção/persistência de vault** é o passo zero da Fase 1: abrir pasta, pedir permissão, persistir handle em IndexedDB.
- **`parser.ts` antes de `indexer.ts`** — o indexer consome a saída do parser.
- **Parser já multi-tipo desde a Fase 1** (escaneia `daily/` + `notes/`, extrai `[[links]]`) — abre porta pra Fase 3 sem refactor, mesmo que a UI de notas só venha depois.
- **Fase 2 depende do round-trip da Fase 1** — escrever no `.md` (corpo + frontmatter lazy) e reler.
- **Marcar como feita (Fase 2)** é o teste real do fluxo bidirecional: reescrever `[ ]`→`[x]` preservando o resto da linha e o frontmatter.
- **Fase 3 depende do editor rico da Fase 2** — o `@` autocomplete e o render de link clicável vivem no mesmo editor (CodeMirror 6).
- **Carry-over (Fase 4)** depende de uma decisão de design ainda em aberto (ver Fase 4): reescrever `📅` na origem vs. criar nova linha no destino.

## Como ler uma fase

Cada doc de fase tem: **objetivo**, **objetivos específicos** (o que precisa existir), **dados/contratos importantes** (tipos, sintaxe, decisões), **entregável** (definição de pronto) e **riscos**. Os **planos de execução** detalhados de cada objetivo vivem em [`../planos/`](../planos/) e são escritos sob demanda.
