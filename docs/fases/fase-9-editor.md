# Fase 9 — Melhorias de editor (backlog)

> **Grab-bag priorizado de melhorias no editor.** Não-bloqueante; cada item é independente e entregável sozinho. Depende só do CodeMirror já montado (Fase 2.5).

## Objetivo

Elevar o editor de "Notion-lite funcional" pra ferramenta de escrita densa: blocos ricos, navegação, paste inteligente. Tudo **não-binário** (puro texto/markdown), sem tocar parser de tasks.

## Backlog priorizado

Ordem = recomendação de valor/esforço. Re-priorizar ao executar.

### Núcleo (alto valor)

1. **Agenda do dia editável** — hoje só renderiza `agenda.json`, sem como **adicionar** compromisso pela UI (gap real, ver `fase-9.5-agenda.md`). *Separado em sub-fase própria — é o mais urgente.*
2. **Callouts/admonitions** — `> [!note]`, `> [!warning]` (Obsidian). `/` insere; render = bloco colorido com ícone.
3. **Find & replace** (`⌘F` / `⌘⌥F`) — `@codemirror/search` já disponível, só plugar o painel + tema.
4. **Auto-continue de listas + Tab/Shift-Tab indent** — Enter em `- ` cria novo item; Tab aninha. Reduz fricção de captura.

### Valioso (médio)

5. **Paste inteligente** — URL com seleção → `[seleção](url)`; tabela/HTML colado → markdown.
6. **Outline / navegação por headings** — painel ou `⌘⇧O` lista headings, clica e pula.
7. **Mais blocos no `/`** — divider, toggle/details, code fence com highlight de linguagem.

### Nice-to-have (baixo / quando der)

8. **Tabelas** — inserir/editar grade markdown (alinhar colunas no save).
9. **Drag pra reordenar** linhas/blocos (handle na margem).
10. **Vim mode** opcional (`@codemirror/vim`), atrás de setting.

## Entregável (definição de pronto)

Por ser backlog, cada item fecha sozinho. Critério geral:
- [ ] Item entregue não toca o parser de tasks nem re-serializa frontmatter.
- [ ] Sintaxe gerada é Obsidian-compatível onde existe convenção (callout, tabela).
- [ ] `/` continua a única porta de entrada de blocos (sem digitar marcador à mão).

## Fora de escopo

- WYSIWYG total (continua Live Preview sobre markdown cru).
- Colaboração, comentários, sugestões.
- Imagens/desenhos (Fases 7/8).

## Riscos

- **Escopo difuso** — tratar cada item como mini-fase; não abraçar tudo de uma vez.
- **Conflito de keymap** com atalhos existentes (`⌘K` palette, etc.) — auditar antes de plugar `⌘F`.
- **Paste inteligente** pode brigar com o handler de paste de imagem (Fase 7) — ordenar handlers (imagem primeiro, texto depois).
