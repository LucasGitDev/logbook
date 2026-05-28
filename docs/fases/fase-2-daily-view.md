# Fase 2 — Daily View

> **A tela principal: nota do dia com editor rico.** Depende do round-trip da Fase 1.

## Objetivo

Construir a tela de uso diário: escrever a nota do dia num editor estilo Notion (sem digitar emoji à mão), ver tasks e agenda parseadas, marcar tasks como feitas (atualizando o `.md` real) e navegar entre dias.

## Objetivos específicos

### 1. `DailyEditor` — editor rico (CodeMirror 6)
- Editor do corpo do `notes.md` baseado em **CodeMirror 6** (mesma base do Obsidian, markdown-friendly).
- `/` → menu de inserção: Agendar (`📅`), Compromisso (`🗓️`+`⏰`), Duração (`⏱️`), task, projeto.
- `@` → autocomplete de nós existentes → insere `[[nome]]` (o grafo é da Fase 3, mas o gatilho nasce aqui).
- `#` → autocomplete de projetos (de `projects.json`).
- Render: emojis e `[[links]]` viram chips/badges, não texto cru.
- Saída é markdown exato (emoji + wikilink no disco); usuário nunca digita os marcadores.
- Salvar dispara re-scan daquele arquivo (Fase 1) e atualiza os índices. Debounce de escrita.

### 2. `TaskList` — Tasks do dia, com check
- Listar tasks do dia (scheduled/created) a partir do índice.
- Checkbox por task → reescreve `[ ]`→`[x]` no `.md` (fluxo bidirecional), preservando frontmatter e resto da linha.
- Refletir estado após reescrita (invalidar query).

### 3. `AgendaView` — Compromissos do dia
- Listar `AgendaItem[]` do dia, ordenados por `⏰`.
- Mostrar horário e duração.

### 4. Navegação
- Sidebar com dias anteriores.
- Navegar entre dias (rota `daily.$date`).
- Hoje como dia default.

## Dados / contratos importantes

- Rotas file-based em `src/routes/` (TanStack Router): `daily.$date.tsx` para o dia.
- Leitura via TanStack Query (cache por dia); escrita via mutations (serializa I/O).
- Zustand guarda UI state: dia selecionado, estado do menu `/`, modais, `rootHandle`.
- **Marcar como feita = o ponto crítico do app.** Reescrever só a linha (`parser.ts` da Fase 1), preservando emojis/tags/frontmatter. Teste de round-trip obrigatório.
- Camada de entrada detalhada em [`../arquitetura.md`](../arquitetura.md#camada-de-entrada-input).

## Entregável (definição de pronto)

- [ ] Escrever na nota e salvar persiste no `.md` real.
- [ ] `/` insere marcadores; `#` autocompleta projetos; emoji nunca digitado à mão.
- [ ] Emojis/links renderizam como chips no editor.
- [ ] Tasks parseadas aparecem na lista do dia.
- [ ] Marcar task como feita atualiza o `.md` (`[ ]`→`[x]`) e a UI reflete.
- [ ] Agenda do dia aparece ordenada por horário.
- [ ] Sidebar lista dias anteriores e navega entre eles.

## Riscos

- **CodeMirror 6 + markdown exato:** garantir que decorações (chips) e autocomplete não corrompam o markdown de saída. Render é camada visual; o documento subjacente continua markdown puro.
- **Bidirecional sob carga:** salvar nota + marcar task quase ao mesmo tempo pode corromper o arquivo. Serializar mutations (Query) e reler antes de reescrever.
- **Debounce vs. perda de dados:** garantir flush ao trocar de dia/fechar.
