# Fase 1 — Vault & Parser

> **Fundação: ler e escrever arquivos reais.** Sem esta fase não há o que renderizar.

## Objetivo

Estabelecer a camada que lê/escreve arquivos do vault e transforma markdown (frontmatter + corpo) em dados tipados. No fim da fase: abrir uma pasta, criar a nota do dia, salvar um `.md` real e ver tasks, agenda e links parseados em memória. O parser já é **multi-tipo** (escaneia `daily/` + `notes/`) pra abrir porta à Fase 3 sem refactor.

## Objetivos específicos

### 0. Seleção e persistência do vault (passo zero)
- Abrir seletor de diretório (`showDirectoryPicker`).
- Pedir permissão de leitura/escrita.
- Persistir o `FileSystemDirectoryHandle` em **IndexedDB** (nunca `localStorage`).
- Ao reabrir o app: recuperar handle e re-pedir permissão (`requestPermission`).
- Bootstrap do vault: criar `meta/`, `daily/`, `notes/`, `.vault.json` se não existirem.

### 1. `src/lib/vault.ts` — File System Access
- Helpers de leitura/escrita por caminho relativo (`daily/YYYY-MM-DD/notes.md`, `notes/*.md`).
- Criar nota do dia (cria diretório `daily/YYYY-MM-DD/` + `notes.md` se faltar).
- Listar nós existentes sob `daily/` e `notes/`.
- Ler/escrever os `.json` de meta.
- Isolar TODA a API do navegador aqui (resto do app não toca `FileSystem*` direto).

### 2. `src/lib/frontmatter.ts` — YAML / Properties
- Parsear frontmatter + corpo com [`gray-matter`](https://github.com/jonschlinkert/gray-matter).
- Ler campos autorais: `id`, `title`, `type`, `tags`, `created`, `aliases`.
- **Injeção lazy:** gerar e inserir frontmatter (com `id` ULID) só na primeira escrita do arquivo; nunca tocar arquivo intacto.
- **Nunca re-serializar** frontmatter ao salvar — preservar byte a byte; só o corpo é reescrito.

### 3. `src/lib/parser.ts` — Markdown → tasks / agenda / links
- Parsear uma linha do corpo → `Task | AgendaItem | null`.
- Detectar `- [ ]`/`- [x]`, `📅`, `🗓️`+`⏰`, `⏱️`, `#tag`.
- Regra: `🗓️` **e** `⏰` → `AgendaItem`; senão checkbox → `Task`.
- Extrair `[[links]]` por arquivo (saída do nó).
- Extrair `text` limpo (sem marcadores).
- Gerar `id` estável (hash de `sourceFile:sourceLine`).
- **Reescrita de linha**: dado um toggle de status, reescrever só o `[ ]`→`[x]` preservando o resto.

### 4. `src/lib/indexer.ts` — Reconstrói os `meta/*.json`
- Escanear todos os `.md` (`daily/` + `notes/`), aplicar parser, montar índices.
- Serializar `meta/tasks.json`, `meta/projects.json`, `meta/links.json` (grafo nó→backlinks), `daily/*/tasks.json`, `daily/*/agenda.json`.
- Re-scan de um arquivo só (ao salvar um nó).

## Dados / contratos importantes

- Tipos em [`src/types/vault.ts`](../../src/types/vault.ts): `Task`, `AgendaItem`, `DailyIndex`, `VaultMeta`, `Note` (nó: `id`, `title`, `type`, `tags`, `created`, `aliases`, `path`, `links`, `backlinks`), `LinkGraph`.
- Frontmatter, sintaxe e resolução de links: ver [`../arquitetura.md`](../arquitetura.md).
- `sourceFile` é caminho relativo ao vault; `sourceLine` **1-based** (decidido).
- `id` de task: hash FNV-1a de `sourceFile:sourceLine` → base36. Mover linha muda id — aceitável (índice reconstruído a cada scan).
- `id` de nó: ULID no frontmatter — estável no rename (decidido).

## Entregável (definição de pronto)

- [x] Abrir vault via picker, permissão concedida, handle persiste entre reloads. → `vault.ts` (`openVault`/`restoreVault`/`verifyPermission`) + `idb.ts`.
- [x] Criar nota do dia gera `daily/YYYY-MM-DD/notes.md` real no disco. → `ensureDailyNote`.
- [x] Frontmatter lido via gray-matter; injeção lazy de `id` na primeira escrita. → `frontmatter.ts`.
- [x] Parser converte markdown de exemplo em `Task[]`, `AgendaItem[]` e lista de `[[links]]` corretos. → `parser.ts`.
- [x] `indexer` reconstrói `meta/tasks.json`, `projects.json` e `links.json` a partir dos `.md`. → `indexer.ts` (`reindexVault`).
- [x] `parser.test.ts` cobre: task simples, agendada, com projeto, feita, agenda com horário/duração, linha não-task, link `[[...]]`. Round-trip de reescrita `[ ]`↔`[x]` preserva a linha **e o frontmatter**.

> **Concluído.** Núcleo puro (`frontmatter.ts`, `parser.ts`) em `c0e3532`; camada browser (`idb.ts`, `vault.ts`, `indexer.ts`) em `7c93c13`. 35 testes verde. Lógica browser testada à mão no Chrome (não roda em happy-dom).

## Riscos

- **`vault.ts` é o componente mais arriscado**: Chrome/Edge only, prompts de permissão, handles que expiram. Isolar bem e testar à mão (File System Access não roda em happy-dom — testar parser/frontmatter puros, mockar I/O).
- **Round-trip de reescrita** precisa preservar frontmatter, emojis, tags e espaços exatos. Teste obrigatório.
