# Fase 4 — Task System

> **Tasks encadeadas entre dias.** Depende do índice global e da reescrita da Fase 1/2.

## Objetivo

Transformar tasks isoladas por dia num sistema: tasks criadas hoje aparecem no dia agendado, tasks abertas se acumulam num inbox, e tudo pode ser filtrado por projeto.

## Objetivos específicos

### 1. Carry-over — jogar task pra amanhã / outro dia
- Reagendar uma task aberta (mudar `📅`).
- **Decisão resolvida:** reescrever o `📅` **na linha de origem** (`setTaskScheduledDate` em `parser.ts`; mutation `useRescheduleTask`). UI: botões rápidos na linha da task (Amanhã / +1 semana / escolher data) em `TaskRow`.

### 2. `TaskInbox` — todas as tasks abertas
- Visão agregada de tasks `open` em todos os dias.
- Útil pra ver o que ficou pendente.

### 3. Filtro por projeto (`#tag`)
- Filtrar tasks/agenda por `#tag`.
- `Project[]` vem de `meta/projects.json` (derivado das tags vistas no scan).

### 4. Visão semanal
- Tasks e agenda da semana, agrupadas por dia.

## Dados / contratos importantes

- `Task.scheduledDate` (`📅`) vs `Task.createdDate` (dia onde foi escrita) — a distinção é o que permite "criar hoje, aparecer no dia agendado".
- Índice global `meta/tasks.json` é a fonte do inbox e dos filtros (derivado — nunca editar à mão).

### Decisão pendente: carry-over

| Abordagem | Prós | Contras |
|---|---|---|
| **Reescrever `📅` na origem** | Uma task = uma linha; histórico simples | Perde o registro de "estava agendada pra X"; muda o arquivo de origem |
| **Nova linha no dia destino** | Preserva trilha; cada dia "possui" suas tasks | Duplica a task; precisa marcar a origem como movida (ex: `[>]`) |

**Decisão final: reescrever `📅` na origem** (mais simples, alinhado ao Obsidian Tasks). Revisitar se o histórico importar.

## Entregável (definição de pronto)

- [x] Criar task com `📅` futura → aparece automaticamente no dia agendado (`createdDate`×`scheduledDate` + `useDailyTasks`).
- [x] Reagendar (carry-over) uma task reescreve só a linha de origem (`setTaskScheduledDate`, `useRescheduleTask`, botões em `TaskRow`).
- [x] Inbox (`/inbox`) lista todas as tasks abertas, agrupadas (atrasadas/hoje/próximas/sem data — `groupInboxTasks`).
- [x] Filtro por `#tag` (`ProjectFilter` + `filterTasksByProject`) aplica em tasks (Inbox/Semana) **e agenda** (Semana) — `AgendaItem.project` extraído pelo parser, projetos da agenda entram no índice.
- [x] Visão semanal (`/week`) agrupa por dia (seg→dom) com tasks + agenda; nav prev/próx.
- [x] Bônus: abas estilo VSCode (`TabBar` + layout route `_app`) — dias/notas/inbox/semana abrem como abas.

## Riscos

- **Decisão de carry-over** afeta o schema e os testes — travar antes de implementar.
- **Performance do scan global** com muitos dias: considerar índice incremental se o vault crescer.
