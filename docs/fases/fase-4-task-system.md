# Fase 4 — Task System

> **Tasks encadeadas entre dias.** Depende do índice global e da reescrita da Fase 1/2.

## Objetivo

Transformar tasks isoladas por dia num sistema: tasks criadas hoje aparecem no dia agendado, tasks abertas se acumulam num inbox, e tudo pode ser filtrado por projeto.

## Objetivos específicos

### 1. Carry-over — jogar task pra amanhã / outro dia
- Reagendar uma task aberta (mudar `📅`).
- **Decisão de design em aberto** (resolver antes de codar): reescrever o `📅` na linha de origem, **ou** criar nova linha no dia destino? Ver abaixo.

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

Recomendação inicial: **reescrever `📅` na origem** (mais simples, alinhado ao Obsidian Tasks). Revisitar se o histórico importar.

## Entregável (definição de pronto)

- [ ] Criar task com `📅` futura → aparece automaticamente no dia agendado.
- [ ] Reagendar (carry-over) uma task atualiza o `.md` conforme a decisão acima.
- [ ] Inbox lista todas as tasks abertas de todos os dias.
- [ ] Filtro por `#tag` funciona em tasks e agenda.
- [ ] Visão semanal agrupa por dia.

## Riscos

- **Decisão de carry-over** afeta o schema e os testes — travar antes de implementar.
- **Performance do scan global** com muitos dias: considerar índice incremental se o vault crescer.
