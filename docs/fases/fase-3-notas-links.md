# Fase 3 — Notas & Links

> **Notas livres e grafo.** Depende do editor rico da Fase 2 e do parser multi-tipo da Fase 1.

## Objetivo

Sair de "só daily notes" para um grafo de nós estilo Obsidian: criar notas livres (`type: note`), linká-las com `[[wikilinks]]` via `@`, e ver backlinks. A fundação (parser multi-tipo, extração de links, `links.json`) já existe desde a Fase 1 — aqui constrói-se a UI e o fechamento do grafo.

## Objetivos específicos

### 1. Notas livres (`type: note`)
- Criar/abrir/renomear notas sob `notes/`.
- Frontmatter com `id` ULID, `title`, `type: note`, `tags`, `created`, `aliases` (injeção lazy, Fase 1).
- Rota file-based para a nota (ex: `note.$id.tsx` ou `note.$slug.tsx` — **decidir** endereçamento por id vs slug).

### 2. `@` link → `[[wikilink]]`
- `@` no editor (gatilho da Fase 2) → autocomplete contra `title`/`aliases` dos nós → insere `[[nome]]`.
- Link clicável: navega pro nó alvo, resolvido por `id` (rename-safe).
- **Link quebrado:** `[[nome]]` sem alvo → opção de criar a nota na hora (cria `notes/nome.md` com frontmatter).

### 3. Backlinks
- Painel de backlinks por nó (quem aponta pra cá), lido de `meta/links.json`.
- Atualiza ao re-scan (derivado, nunca escrito no frontmatter).

### 4. Rename-safe
- Renomear nota não quebra links: o vínculo é por `id`.
- Reescrever os `[[nome]]` apontando pro novo nome nos arquivos que linkam (à la Obsidian) — **opcional nesta fase**, decidir escopo.

## Dados / contratos importantes

- Tipo `Note` (introduzido na Fase 1): `id`, `title`, `type`, `tags`, `created`, `aliases`, `path`, `links[]`, `backlinks[]`.
- `meta/links.json`: grafo derivado nó→backlinks. Reconstruído a cada scan, nunca editado à mão.
- Resolução de link por `id`+`aliases`, exibição por nome. Ver [`../arquitetura.md`](../arquitetura.md#resolução-de-links).

### Decisões pendentes
- **Endereçamento de rota:** por `id` (estável, feio na URL) vs `slug` do título (legível, muda no rename). Sugestão: `id` na rota, slug só cosmético.
- **Rewrite de `[[nome]]` no rename:** fazer agora (igual Obsidian) ou deixar o `id` resolver e adiar. Sugestão: adiar — `id` já resolve.

## Entregável (definição de pronto)

- [ ] Criar nota livre sob `notes/` com frontmatter (lazy).
- [ ] `@` no editor lista notas e insere `[[nome]]`.
- [ ] Clicar num link navega pro nó (resolvido por `id`).
- [ ] Link quebrado oferece criar a nota.
- [ ] Painel de backlinks mostra quem aponta pra nota.
- [ ] Renomear nota não quebra links existentes.

## Riscos

- **Ambiguidade de nome:** dois nós com mesmo `title`/alias. Resolver por `id`; UI desambigua na escolha do `@`.
- **Performance do grafo** com muitos nós: `links.json` incremental se crescer.
