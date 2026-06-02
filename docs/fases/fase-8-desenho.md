# Fase 8 — Desenho à mão livre (Excalidraw)

> **Desenhar à mão livre, embeddado no meio dos arquivos.** Depende do pipeline de embed/block-widget da Fase 7 e do modelo de nó (Fase 3/6).

## Objetivo

Criar desenhos à mão livre com Excalidraw, persistidos como **nós próprios** (`type: drawing`), linkáveis e embeddáveis inline. Preview renderiza no Live Preview; clicar abre o editor de canvas.

## Decisões travadas

- **Lib = Excalidraw.** Estética à mão livre, Obsidian-compat, formato texto/diffável. Pacote `@excalidraw/excalidraw` (componente React).
- **Desenho = nó** (não embed solto): `drawings/<título>.excalidraw.md`, `type: drawing`, rota `/drawing/$id`, linkável por `@`/`[[ ]]`. Encaixa no modelo "tudo é nó" (igual `note`/`task`).
- **Embeddado inline:** no corpo de qualquer nó, `![[desenho]]` renderiza o **preview SVG**; clique abre o canvas. Atende o "no meio dos arquivos" sem meter um canvas pesado dentro do CodeMirror.
- **Texto, não binário:** a cena Excalidraw é JSON. Persistir como **texto** preserva o princípio git-friendly. Preview = **SVG** (texto, diffável) via `exportToSvg`.

## Modelo

```markdown
---
id: 01HZX...
title: Arquitetura do parser
type: drawing
created: 2026-06-02
---

```json excalidraw      # cena Excalidraw (fonte de verdade, texto/diffável)
{ "type": "excalidraw", "elements": [...], "appState": {...} }
```
```

Embeddado num daily/note:
```markdown
![[arquitetura-do-parser]]   # render = SVG do desenho, clique abre /drawing/$id
```

- **Fonte de verdade = JSON da cena** dentro do nó. SVG é derivado (preview); pode ser cacheado mas não é autoral.
- **Obsidian-compat byte a byte** com o plugin Excalidraw (formato `excalidraw-plugin: parsed`, JSON comprimido) é **stretch goal** — MVP usa JSON legível num fence `json excalidraw`. Risco anotado abaixo.

## Contratos novos

| Onde | O quê |
|---|---|
| `src/lib/drawing.ts` (novo) | `createDrawing(root, title)`, parse/serialize da cena (extrai/injeta o fence JSON), `sceneToSvg(scene)` via `exportToSvg` |
| `src/routes/drawing.$id.tsx` (novo) | rota com `<Excalidraw />`; onChange (debounced, mesmo padrão de save) → re-serializa cena → escreve nó |
| `src/components/DailyEditor.tsx` | estende o embed-field da Fase 7: `![[x]]` que resolve pra `type: drawing` → widget de preview SVG clicável |
| parser/indexer | reconhece `type: drawing` no scan; `@`/Sidebar oferecem desenhos; `![[desenho]]` conta como embed (não backlink, igual imagem) |

## Fluxos

- **Criar:** via CreateModal (do plano `imperative-doodling-deer`, estender com kind `drawing`) ou `@ → Criar desenho` → cria nó `drawings/<título>.excalidraw.md` → navega `/drawing/$id`.
- **Desenhar:** canvas Excalidraw; onChange salva a cena (debounce) no nó, igual qualquer editor.
- **Embeddar:** num daily/note, `@` insere `![[desenho]]`; widget renderiza SVG; clique → `/drawing/$id`.
- **Linkar:** desenho é nó → backlinks normais; aparece no grafo como qualquer nó.

## Entregável (definição de pronto)

- [ ] Nó `type: drawing` em `drawings/`; cena JSON texto/diffável como fonte de verdade.
- [ ] Rota `/drawing/$id` com Excalidraw; salva onChange (debounced), preserva frontmatter byte a byte.
- [ ] `![[desenho]]` renderiza preview SVG inline; clique abre o canvas.
- [ ] `@`/Sidebar/CreateModal oferecem desenhos; aba estilo VSCode (`kind: drawing`).
- [ ] Bundle Excalidraw carregado lazy (code-split na rota) — não pesa o app inteiro.

## Fora de escopo

- Compat byte-a-byte com plugin Excalidraw do Obsidian (stretch — ver risco).
- Colaboração em tempo real, biblioteca de shapes custom.
- Desenho embeddado **editável inline** (só preview + abrir; edição na rota).
- Exportar PNG (SVG basta pro preview).

## Riscos

- **Bundle Excalidraw é grande** — mitigar com code-splitting/lazy na rota `/drawing/$id`. Preview SVG não importa a lib (render de SVG cru).
- **Obsidian-compat:** o formato do plugin é JSON comprimido + PNG embed; nosso JSON legível abre no Logbook mas não no plugin sem conversão. Aceitável (MVP prioriza git-friendly); migração fica fora de escopo.
- **`exportToSvg` exige a lib** — gerar SVG no momento do save (na rota, onde a lib já está) e cachear, pra que o widget de preview não precise importar Excalidraw.
- **Cena grande = JSON grande no `.md`** — diff fica ruidoso em desenhos complexos. Trade-off aceito vs. binário.
