# Fase 9.5 — Adicionar compromisso à agenda (UX)

> **Gap real:** o painel "Agenda do Dia" só renderiza `agenda.json` (read-only). Não há porta de entrada de 1ª classe pra adicionar um compromisso. Sub-fase da Fase 9, separada por ser o item mais urgente.

## Diagnóstico (bug atual)

- O parser só vira `AgendaItem` a partir de uma **linha de checkbox** (`parser.ts:84` — sem `CHECKBOX` match → `null`). Formato canônico: `- [ ] texto 🗓️ data ⏰ hora ⏱️ dur #proj`.
- O slash command `/Compromisso (Event)` insere só `🗓️ ${today} ⏰ 09:00 ` — **sem o `- [ ]`** (`DailyEditor.tsx:499`). Resultado: linha ignorada pelo parser, compromisso nunca aparece no painel.
- Efeito: na prática "não dá pra adicionar agenda" — o único caminho (slash) está quebrado, e o painel não tem affordance de adicionar.

## Objetivo

1. **Corrigir o slash** `/Compromisso` pra inserir linha completa (`- [ ] 🗓️ ⏰`), consistente com `/Tarefa`.
2. **Affordance no painel:** botão `+` no cabeçalho "Agenda do Dia" → mini-form (hora, texto, duração opcional, projeto opcional) que escreve a linha no nó do dia. Sem digitar emoji à mão (princípio).

## Modelo

Linha gerada (já suportada pelo parser/round-trip):
```markdown
- [ ] 1:1 com gestor 🗓️ 2026-06-02 ⏰ 14:00 ⏱️ 30min #gestao
```

A data do `🗓️` = o dia da daily aberta (não pede ao usuário). Form coleta: **hora** (obrigatória), **texto** (obrigatório), duração e projeto (opcionais).

## Fluxos

- **Quick-fix (independente, pode ir já):** alterar o `apply` do `/Compromisso` pra `- [ ] 🗓️ ${today} ⏰ 09:00 `.
- **Painel:** `+` abre form inline/popover → monta a linha na ordem canônica (texto + 🗓️ + ⏰ + ⏱️? + #?) → acrescenta ao corpo do nó do dia (append em seção/fim) → save → reindex → painel atualiza.
- Reusa o builder de linha do mesmo jeito que tasks (ordem fixa de emojis → diff limpo).

## Entregável (definição de pronto)

- [x] `/Compromisso` gera linha de checkbox válida (aparece no painel).
- [x] Botão `+` no cabeçalho "Agenda do Dia" abre form (hora/texto + duração).
- [x] Form escreve a linha canônica no nó do dia (`useAddAgenda` + `buildAgendaLine`); nunca emoji digitado à mão.
- [x] Compromisso novo aparece no painel após save (write + sync editor + reindex).
- [ ] Campo de projeto (#) no form (builder já suporta; UI ainda só hora/texto/duração).
- [ ] Editar hora/concluir compromisso reusa mecânica de task (status na checkbox).

## Fora de escopo

- Vista de calendário/timeline com drag.
- Notificações/lembretes.
- Recorrência de compromissos.

## Riscos

- **Onde acrescentar a linha** no corpo (fim do doc vs seção "Agenda") — definir convenção; sem seção, append no fim.
- **Conflito com o painel read-only atual** (`AgendaView`) — passar a aceitar o callback de criação sem virar editor.
