# Fases

O trabalho é dividido em 5 fases sequenciais. Cada fase entrega algo usável de ponta a ponta e desbloqueia a próxima.

```
Fase 1 ─▶ Fase 2 ─▶ Fase 2.5 ─▶ Fase 3 ─▶ Fase 4 ─▶ Fase 5 ─▶ Fase 6 ─▶ Fase 7 ─▶ Fase 8 ─▶ Fase 9
Vault &   Daily      UI/UX       Notas &   Task       Polim.    Task      Anexos    Desenho   Editor
Parser    View       (LivePrev)  Links     System               como nó   (embed)   (Excali)  (backlog)
└── 1-6 concluídas ──────────────────────────────────────────┘└── 7-9 backlog ─────────────────┘
```

> **7 (anexos)** é pré-requisito de **8 (desenho)** — desenho reusa o pipeline de embed/block-widget. **9** é grab-bag independente; a sub-fase **9.5 (agenda editável)** corrige um gap já existente e pode ir a qualquer momento.

| Fase | Tema | Objetivo central | Entregável | Status |
|---|---|---|---|---|
| [**1**](./fase-1-vault-parser.md) | Vault & Parser | Ler/escrever arquivos reais; parsear frontmatter, sintaxe e links | Abrir vault, criar nota do dia, salvar `.md`, ver tasks/agenda/links parseados | ✅ Concluída |
| [**2**](./fase-2-daily-view.md) | Daily View | A tela principal com editor rico | Editor `/`+`@`, ver tasks, marcar como feita (atualiza o `.md`), navegar dias | ✅ Concluída |
| [**2.5**](./fase-2.5-ui-ux.md) | Redefinição UI/UX | Identidade dev + editor Live Preview | 2 temas, render markdown ao vivo (Notion-like), statusbar/topbar, `⌘K`, modo foco | ✅ Concluída |
| [**3**](./fase-3-notas-links.md) | Notas & Links | Notas livres e grafo | Criar notas livres, `[[links]]` via `@`, backlinks, criar nota a partir de link | ✅ Concluída |
| [**4**](./fase-4-task-system.md) | Task System | Tasks encadeadas entre dias | Criar task hoje → aparece no dia agendado; carry-over; inbox; filtro por projeto; visão semanal; abas VSCode | ✅ Concluída |
| [**5**](./fase-5-polimento.md) | Polimento | UX, mobile e git flow | Tema persistido em settings.json, layout responsivo (drawer + aviso FS Access), git informativo (branch no statusbar), atalhos | ✅ Concluída |
| [**6**](./fase-6-task-node.md) | Task como nó | Tarefa como entidade forte | Nós `tasks/*.md` linkáveis/descritíveis; promoção one-way; prioridade/4 status/esforço; rota `/task/$id`; declaração via `[[link]]` | ✅ Concluída |
| [**7**](./fase-7-anexos.md) | Anexos & embeds | Pipeline de imagem/binário | Colar imagem → `assets/YYYY/MM/<hash>`; embed `![[...]]` inline; `vault.ts` lê/escreve binário | 📋 Backlog |
| [**8**](./fase-8-desenho.md) | Desenho à mão livre | Excalidraw como nó | `drawings/*.excalidraw.md` (`type: drawing`, cena JSON texto); embed inline (preview SVG); rota `/drawing/$id` | 📋 Backlog |
| [**9**](./fase-9-editor.md) | Melhorias de editor | Editor denso | Backlog priorizado; sub-fase [9.5 Agenda editável](./fase-9.5-agenda.md), callouts, find&replace, listas, paste | 📋 Backlog |

## Dependências entre objetivos

- **Fase 1 pré-requisito de tudo.** Sem `vault.ts` (I/O) e `parser.ts` (frontmatter + sintaxe → dados) não há o que renderizar.
- **Seleção/persistência de vault** é o passo zero da Fase 1: abrir pasta, pedir permissão, persistir handle em IndexedDB.
- **`parser.ts` antes de `indexer.ts`** — o indexer consome a saída do parser.
- **Parser já multi-tipo desde a Fase 1** (escaneia `daily/` + `notes/`, extrai `[[links]]`) — abre porta pra Fase 3 sem refactor, mesmo que a UI de notas só venha depois.
- **Fase 2 depende do round-trip da Fase 1** — escrever no `.md` (corpo + frontmatter lazy) e reler.
- **Marcar como feita (Fase 2)** é o teste real do fluxo bidirecional: reescrever `[ ]`→`[x]` preservando o resto da linha e o frontmatter.
- **Fase 3 depende do editor rico da Fase 2** — o `@` autocomplete e o render de link clicável vivem no mesmo editor (CodeMirror 6).
- **Carry-over (Fase 4)** — decisão resolvida: **reescrever `📅` na linha de origem** (`setTaskScheduledDate`), alinhado ao Obsidian Tasks.

## Como ler uma fase

Cada doc de fase tem: **objetivo**, **objetivos específicos** (o que precisa existir), **dados/contratos importantes** (tipos, sintaxe, decisões), **entregável** (definição de pronto) e **riscos**. Os **planos de execução** detalhados de cada objetivo vivem em [`../planos/`](../planos/) e são escritos sob demanda.
