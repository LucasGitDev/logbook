# Arquitetura

## Princípio central

```
markdown (.md)  ──parser──▶  índice em memória  ──serializer──▶  meta/*.json (derivado)
      ▲                                                                
      └──────────────── UI escreve de volta (reescrita de linha) ──────┘
```

O `.md` é a única fonte de verdade. Tudo mais é derivado e descartável: apagar os `.json` e reabrir o vault reconstrói o índice idêntico.

## Modelo: grafo de nós (não só daily)

Cada `.md` é um **nó**. A nota do dia é apenas um tipo de nó (`type: daily`); notas livres (`type: note`) são nós nomeados que podem ser linkados entre si — modelo Obsidian. O parser trata todos os nós igual; a UI diferencia pelo `type`.

```
vault/
├── daily/
│   └── YYYY-MM-DD/notes.md      # nó do dia (type: daily)
├── notes/
│   └── *.md                     # notas livres (type: note)
├── meta/
│   ├── tasks.json               # índice global de tasks (derivado)
│   ├── projects.json            # projetos / #tags (derivado)
│   ├── links.json               # grafo: nó → backlinks (derivado)
│   └── settings.json            # preferências do app
└── .vault.json                  # versão do schema, última abertura
```

## Anatomia de um nó

```markdown
---
id: 01HZX3QK7M8P                 # ID estável (ULID/uuid) — nunca muda, mesmo no rename
title: Reunião de planejamento
type: note                       # note | daily
tags: [trabalho, infra]
created: 2026-05-28
aliases: [planning, plano-q2]
---

Corpo em markdown.

- [ ] Task aqui 📅 2026-05-30 #trabalho
- [ ] 1:1 com gestor 🗓️ 2026-05-29 ⏰ 14:00 ⏱️ 30min

Linka outra nota: [[outra-nota]]
```

### Frontmatter (YAML / Obsidian Properties)

**Regra de ouro:** frontmatter guarda **metadata autoral** (o que o app/usuário *declara* sobre o nó). NUNCA guarda dado **derivado**.

| Vai no frontmatter (autoral, fonte) | Fica em `meta/*.json` (derivado) |
|---|---|
| `id`, `title`, `type`, `tags`, `created`, `aliases` | backlinks, índice de tasks, grafo de links |

Backlink é derivado → fica em `links.json`. Se fosse no frontmatter, linkar uma nota obrigaria reescrever o frontmatter dela = viola o fluxo bidirecional.

**Injeção lazy:** `.md` sem frontmatter é válido (Obsidian aceita). O app só injeta frontmatter quando escreve no arquivo pela primeira vez — nunca toca arquivo que o usuário não mexeu.

**Parser de frontmatter:** [`gray-matter`](https://github.com/jonschlinkert/gray-matter) (parseia frontmatter + body num passo).

## Sintaxe inline (corpo do nó)

Segue o padrão do plugin Obsidian Tasks. Emojis = marcadores semânticos. Frontmatter descreve o *nó*; emoji inline descreve *cada task*. Coexistem.

```markdown
- [ ] Texto da tarefa                              # task simples (sem data)
- [ ] Texto da tarefa 📅 2026-05-30                # task agendada
- [ ] Texto da tarefa 📅 2026-05-30 #projeto       # task com projeto
- [x] Tarefa concluída 📅 2026-05-29               # task feita

- [ ] 1:1 com gestor 🗓️ 2026-05-29 ⏰ 14:00 ⏱️ 30min   # agenda (tem horário)

[[outra-nota]]                                     # link entre nós (wikilink)
```

| Marcador | Significado |
|---|---|
| `- [ ]` / `- [x]` | task aberta / feita |
| `📅 YYYY-MM-DD` | data de agendamento da task |
| `🗓️ YYYY-MM-DD` + `⏰ HH:MM` | compromisso de agenda (precisa dos dois) |
| `⏱️ Nmin` | duração em minutos |
| `#tag` | projeto / contexto |
| `[[nome]]` | link para outro nó |

Regra de classificação: linha com `🗓️` **e** `⏰` → agenda. Caso contrário, checkbox → task.

## Resolução de links

`[[nome]]` no disco é legível e compatível com Obsidian. Internamente o app resolve o alvo via `id` do frontmatter + `aliases`, não pelo nome cru:

- Escrever: usuário digita `@`, escolhe a nota, app insere `[[nome-da-nota]]`.
- Resolver: app casa `nome` contra `title`/`aliases` dos nós e guarda o vínculo por `id` em `links.json`.
- **Rename-safe:** renomear o arquivo não quebra o vínculo — o `id` é a âncora. (Reescrever os `[[nome]]` apontando pro arquivo renomeado, à la Obsidian, fica pra fase de Notas & Links.)

## Camada de entrada (input)

Emoji e `[[...]]` **nunca são digitados à mão**. São formato de *disco*; a edição usa açúcar de UX por cima:

| Camada | Formato | Quem vê |
|---|---|---|
| Entrada (editor) | `/` commands, `@` para linkar, autocomplete de `#tags` | usuário |
| Disco (`.md`) | emoji (`📅`), wikilink (`[[...]]`), frontmatter YAML | Obsidian, git, parser |

- `/` → menu de inserção (Agendar `📅`, Compromisso `🗓️`+`⏰`, Duração `⏱️`, task, projeto).
- `@` → autocomplete de nós existentes → insere `[[nome]]`.
- `#` → autocomplete de projetos (de `projects.json`).
- Render: emojis/links viram chips/badges clicáveis, não texto cru.

**Editor:** CodeMirror 6 (mesma base do Obsidian; markdown-friendly, suporta as decorações e autocomplete acima). Decisão detalhada na Fase 2.

## Modelo de dados

Tipos canônicos em [`src/types/vault.ts`](../src/types/vault.ts). A introduzir nesta arquitetura:

- **`Note`** (nó) — `id`, `title`, `type` (`"daily" | "note"`), `tags[]`, `created`, `aliases[]`, `path`, `links[]` (saída), `backlinks[]` (derivado).
- **`Task`** — `id` (hash de `sourceFile:sourceLine`), `text`, `status`, `createdDate`, `scheduledDate?`, `project?`, `sourceFile`, `sourceLine`.
- **`AgendaItem`** — `id`, `text`, `date`, `time`, `durationMin?`, `status`, `sourceFile`, `sourceLine`.
- **`DailyIndex`** — `date`, `scheduledTaskIds[]`, `createdTaskIds[]`.
- **`Project`** — `tag`, `color?`.
- **`VaultMeta`** — `schemaVersion`, `lastOpened`.

`sourceFile` + `sourceLine` tornam a reescrita bidirecional possível: dado um `Task`, sabemos qual linha de qual arquivo reescrever.

## Fluxo do parser

1. Ao abrir o vault, escaneia todos os `.md` sob `daily/` **e** `notes/`.
2. Por arquivo: separa frontmatter (gray-matter) do corpo; extrai tasks, agendas e `[[links]]`; gera `id` estável por linha de task.
3. Reconstrói `meta/tasks.json`, `meta/projects.json` e `meta/links.json` do zero (índices, não dado original).
4. Marcar task como feita na UI → reescreve só aquela linha (`[ ]`→`[x]`) no corpo, preservando o resto (emojis, tags, links) **e o frontmatter byte a byte**.
5. Salvar qualquer nó → re-escaneia só aquele arquivo e atualiza os índices.

## Decisões de design

- **Sem backend.** Tudo no cliente via File System Access API. Sem servidor, SSR ou Next.js.
- **Markdown como verdade.** Nunca sobrescrever o `.md` com dados do JSON.
- **Frontmatter = autoral, `meta/*.json` = derivado.** Ver regra de ouro acima.
- **Reescrita por linha, não reserialização.** Edita a linha existente; nunca regenera o arquivo a partir do índice. Frontmatter nunca é re-serializado (reordenaria chaves, mudaria aspas, sujaria o diff) — só lido.
- **`id` estável no frontmatter.** Âncora de links e referência cruzada, rename-safe. Injeção lazy.
- **Link resolve por `id`, exibe nome.** Compat Obsidian + rename-safe.
- **Git-friendly.** Diffs legíveis, sem binários. Vault pode ser repo separado.

## Limitações conhecidas

- **Chrome/Edge only.** Firefox e Safari não implementam File System Access API.
- **Permissão por sessão.** O `FileSystemDirectoryHandle` precisa de re-permissão a cada sessão. Persistimos o handle em **IndexedDB** (não `localStorage`, proibido) e re-pedimos permissão (`requestPermission`) ao reabrir.
- **Round-trip delicado.** Reescrever uma linha tem que preservar frontmatter e demais linhas exatos. Teste de round-trip obrigatório.
- **Sem watch externo (v1).** Editar o `.md` por fora (Obsidian) com o app aberto não dispara re-scan automático; re-scan é manual/no foco.
- **Race conditions de I/O.** Escrita async sujeita a corrida; TanStack Query serializa mutations e dá retry/invalidation.

## Decisões ainda pendentes

- ~~**`sourceLine` 0-based vs 1-based** (Fase 1)~~ → **1-based** (decidido, Fase 1). *Importante: refere-se à linha real de todo o arquivo no disco (incluindo o bloco de frontmatter se houver), não apenas do corpo de texto. O offset do frontmatter é calculado e somado automaticamente no indexador.*
- ~~**Formato do `id`**: ULID vs uuid v4~~ → **ULID** (decidido, Fase 1).
- **Carry-over** (Fase 4): reescrever `📅` na origem vs. nova linha no destino. Detalhe na fase.
