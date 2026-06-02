# Documentação — Diário de Bordo

App de diário de trabalho pessoal com vault local em markdown. Interface web (React + Vite) que lê e escreve arquivos reais via File System Access API. Sem backend, sem banco — markdown é a fonte de verdade.

## Onde está cada coisa

| Documento | Conteúdo |
|---|---|
| [`arquitetura.md`](./arquitetura.md) | Modelo de dados, fluxo bidirecional `.md` ↔ índice, decisões e limitações |
| [`fases/`](./fases/) | Divisão do trabalho em 4 fases, com objetivos e dados-chave por fase |
| [`planos/`](./planos/) | Planos de execução detalhados por objetivo (preenchidos sob demanda) |

## Visão

Cada `.md` é um **nó**: a nota do dia é um tipo (`daily`), notas livres (`note`) são nós nomeados que se linkam entre si — modelo Obsidian. Escrever em markdown → o app detecta tasks, agendas e links pela sintaxe → reconstrói índices derivados → renderiza a UI. Marcar uma task como feita na UI reescreve o `.md` original. O markdown nunca é sobrescrito por dados do JSON.

Edição estilo Notion: o usuário **nunca digita emoji nem `[[...]]` à mão** — `/` insere marcadores, `@` linka notas, `#` autocompleta projetos. O disco continua em formato Obsidian (emoji + wikilinks + frontmatter), compatível com o plugin [Obsidian Tasks](https://publish.obsidian.md/tasks/) e Properties.

## Roadmap (resumo)

| Fase | Tema | Entregável | Status |
|---|---|---|---|
| **1** | [Vault & Parser](./fases/fase-1-vault-parser.md) | Abrir vault, criar nota do dia, salvar `.md` real, parsear frontmatter/tasks/agenda/links | ✅ Concluída |
| **2** | [Daily View](./fases/fase-2-daily-view.md) | Editor rico (`/` e `@`), ver tasks parseadas, marcar como feita (atualiza o `.md`) | ✅ Concluída |
| **2.5** | [Redefinição UI/UX](./fases/fase-2.5-ui-ux.md) | 2 temas, editor Live Preview (Notion-like), casca dev (statusbar/topbar), `⌘K` | ✅ Concluída |
| **3** | [Notas & Links](./fases/fase-3-notas-links.md) | Notas livres, `[[wikilinks]]`, backlinks, criar nota via link | ✅ Concluída |
| **4** | [Task System](./fases/fase-4-task-system.md) | Carry-over entre dias, inbox de tasks abertas, filtro por projeto, visão semanal, abas VSCode | ✅ Concluída |
| **5** | [Polimento](./fases/fase-5-polimento.md) | Tema (persistido em settings.json), mobile responsivo, git informativo, atalhos de teclado | ✅ Concluída |
| **6** | [Task como nó](./fases/fase-6-task-node.md) | Tarefas viram nós de 1ª classe (`tasks/`): promoção, propriedades (prioridade, 4 status, esforço), rota própria, declaração via link | ✅ Concluída |
| **7** | [Anexos & embeds](./fases/fase-7-anexos.md) | Colar imagem do clipboard → `assets/YYYY/MM/<hash>`; embed `![[...]]` renderizado inline; pipeline de I/O binário | 📋 Backlog |
| **8** | [Desenho à mão livre](./fases/fase-8-desenho.md) | Excalidraw como nó (`type: drawing`, cena JSON texto); embed inline com preview SVG; rota `/drawing/$id` | 📋 Backlog |
| **9** | [Melhorias de editor](./fases/fase-9-editor.md) | Backlog priorizado: agenda editável ([9.5](./fases/fase-9.5-agenda.md)), callouts, find&replace, listas, paste inteligente | 📋 Backlog |

As fases são sequenciais: cada uma entrega algo usável e desbloqueia a próxima. Detalhes de dependência em [`fases/README.md`](./fases/README.md).

## Princípios inegociáveis

- **Markdown é a verdade.** Os `meta/*.json` (tasks, projects, links) são índices derivados — reconstruídos do zero, nunca editados à mão.
- **Frontmatter = autoral, `meta/*.json` = derivado.** Frontmatter guarda o que o nó *declara* (`id`, `title`, `type`, `tags`); backlinks e índices ficam no JSON.
- **Bidirecional num só sentido por vez.** UI escreve no `.md`; parser re-indexa. Nunca o índice escreve no `.md`.
- **Emoji e `[[...]]` nunca digitados à mão.** São formato de disco; a UI traduz a partir de `/`, `@`, `#`.
- **Sem `localStorage`/`sessionStorage`.** Handles de diretório persistem em IndexedDB.
- **Git-friendly.** Diffs legíveis, sem binários; o vault pode ser um repositório separado.
- **Chrome/Edge only.** File System Access API não existe no Firefox/Safari.
