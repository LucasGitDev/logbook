# Fase 6 — Task como nó (entidade forte)

> **Tarefas viram nós de primeira classe.** Depende do parser/índice (Fase 1) e do grafo de links (Fase 3).

## Objetivo

Promover a tarefa de uma simples **linha** (`- [ ] ...`) a um **nó** próprio — igual `note` e `daily`: arquivo em `tasks/`, linkável (`@`/`[[ ]]`), descritível (corpo markdown), declarável em dias/notas, com backlinks e propriedades. Dois níveis convivem: linha leve (captura rápida) e nó forte (sob demanda).

## Modelo

Dois níveis:
- **Task-linha** (leve): `- [ ] x 📅 data #proj` dentro de um daily/note. Verdade na linha, zero fricção. Como nas fases anteriores.
- **Task-nó** (forte): `tasks/<título>.md`. **Arquivo é a fonte de verdade.** Criada **promovendo** uma linha (one-way, sem reversão) ou via `@ → Criar task`.

```markdown
---
id: 01HZX...           # ULID — âncora de link rename-safe
title: Deploy do app
type: task
priority: high         # high | medium | low (opcional)
effort: 2h             # estimativa (opcional)
created: 2026-05-29
---
- [ ] Deploy do app 📅 2026-05-30 #infra    # linha canônica: status + due + projeto

Descrição livre. Liga em [[infra-q2]].
```

**Onde cada propriedade mora** (uma casa só):
| Prop | Casa | Mecânica |
|---|---|---|
| status (4: open `[ ]`, doing `[/]`, done `[x]`, cancelled `[-]`) | char da checkbox na linha canônica | `setTaskStatus`/`charToStatus` |
| due (`📅`) + projeto (`#`) | linha canônica | `setTaskScheduledDate` / parse |
| prioridade + esforço | frontmatter | builder determinístico (ordem fixa → diff limpo) |
| descrição, `[[links]]`, subtarefas | corpo | markdown livre |

## Fluxos

- **Declarar:** dia/nota contém `[[task]]`; o nó é a verdade. Render mostra status ao vivo; toggle escreve no nó. A task aparece no painel do dia que a declara, mesmo sem `📅` (`useDailyTasks` une links do daily).
- **Promover** (`usePromoteTask`): cria `tasks/<título>.md` com o estado atual, reescreve a linha de origem → `- [[título]]`, reindexa.
- **Editar:** rota `/task/$id` (editor + painel de propriedades: status/prioridade/esforço/backlinks).
- **Linkar/navegar:** `@` oferece tasks; clicar `[[task]]` abre `/task/$id`. Inbox/Semana mostram task-nós com chips de prioridade/esforço (a linha canônica é enriquecida com os metadados do nó no índice).

## Entregável (definição de pronto)

- [x] Task vira nó (`tasks/*.md`, `type: task`): linkável, descritível, declarável.
- [x] Dois níveis convivem; promoção one-way (linha → nó) via `usePromoteTask` + botão na TaskRow.
- [x] Estado na linha canônica (4 status, due, projeto); prioridade + esforço no frontmatter.
- [x] Rota `/task/$id` com painel de propriedades editável; aba estilo VSCode (`kind: task`).
- [x] `@` linka/cria tasks; navegação `[[task]]` → rota do nó; Sidebar lista tarefas; Inbox/Semana com chips.
- [x] Declarar `[[task]]` num dia a faz aparecer no painel daquele dia.

## Fora de escopo

- Reverter promoção (nó → linha).
- Subtarefas como entidade (checkbox extra no corpo é só markdown; canônica = 1ª linha).
- Migração forçada das linha-tasks (coexistem; promove sob demanda).
- Dependências entre tasks, recorrência.

## Riscos

- **Re-serialização de frontmatter** ao editar prioridade/esforço — mitigado pelo builder de ordem fixa (mesmo precedente do rename); só o campo alterado muda no diff.
- **Colisão de nome** entre nota e task de mesmo título (`resolveLinkTarget` devolve o primeiro). Aceitável por ora.
- **Reindex a cada promoção/edição** — custo OK em vault pequeno; revisitar índice incremental se crescer.
