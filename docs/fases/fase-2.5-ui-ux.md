# Fase 2.5 — Redefinição UI/UX

> **Identidade visual de ferramenta dev + editor Live Preview estilo Notion.** Inserida entre a Fase 2 (Daily View) e a Fase 3 (Notas & Links). Não adiciona funcionalidade de domínio — refina a experiência da tela que já existe antes de construir mais em cima dela.

## Motivação

A Fase 2 funciona, mas o visual é de "SaaS premium genérico" (gradiente indigo/roxo, glassmorphism, blur, pulse, orbs, fontes sans display) — não casa com o usuário-alvo (dev: VSCode/Cursor, tema Dracula, Fira Code). O problema não é cor, é **execução**: tipografia tímida, cards flutuando no vazio, zero casca de ferramenta, sem hierarquia.

Direção aprovada via wireframe estático ([`../wireframe.html`](../wireframe.html)): **flat, denso, alto contraste, mono no cromo, casca de ferramenta dev** — sem cair em enfeite chamativo.

## Princípios de design (inegociáveis nesta fase)

- **Flat.** Zero glassmorphism/blur, zero orbs de fundo, zero pulse/ping decorativo. Gradiente só (talvez) no ícone do logo.
- **Cor = significado, não decoração.** Um acento usado com parcimônia; superfícies neutras fazem o trabalho. Cor reservada para status/marcadores.
- **Hierarquia por tipo, não por cor.** Peso e tamanho de fonte criam foco; headers em branco sólido, não cinza-10px.
- **Movimento calmo.** ~120ms, só `opacity`/`transform`. Nada bouncy.
- **Casca de ferramenta dev.** Mono (Fira Code) no cromo, statusbar utilitária, densidade. Utilitário, não vistoso.

## Objetivos específicos

### 1. Sistema de temas (2 temas)
- Dois temas: **`default`** (o escuro premium atual, recalibrado flat) e **`dracula-soft`** (acentos dessaturados do Dracula Pro).
- Tokens semânticos em `src/styles/globals.css`: raw vars por tema + `[data-theme="…"]` override + `@theme inline` (Tailwind v4) expondo utilities (`bg-bg`, `text-fg`, `border-line`, `text-accent`, chips…). _Fundação já escrita._
- **Sweep nos componentes:** trocar toda cor hardcoded (`bg-[#0a0a0c]`, `text-gray-400`, `text-indigo-400`…) por utilities semânticas, senão o switch troca só metade. ~120 ocorrências em `Sidebar`, `TaskList`, `AgendaView`, `DailyEditor`, `daily.$date`, `index`.
- Trocar tema via `⌘K` ou toggle discreto na topbar.

### 2. Editor Live Preview (estilo Notion/Obsidian) — **requisito central**
- O editor renderiza o markdown **enquanto se digita**, no mesmo lugar: `#` vira título, `---` vira divisória, `**bold**` fica negrito, `> ` vira citação, listas/código formatados — sem painel de preview separado.
- **Markdown cru aparece só na linha sob o cursor** (estilo Obsidian Live Preview): edita-se o texto real; ao sair da linha, ela "fecha" no render. Reaproveita o padrão de _reveal-on-cursor_ já existente nos chips (`isCursorInside` + `selectionSet`).
- Implementado por **decorações do CodeMirror 6** dirigidas pela **syntax tree** do `@codemirror/lang-markdown` (não regex): `Decoration.line`/`mark` para headings/ênfase/código inline, `Decoration.replace` (block widget) para `---`/imagens, esconder os marcadores (`#`, `**`, `` ` ``) fora da linha ativa.
- **O documento subjacente continua markdown exato** — render é camada visual, jamais altera bytes no disco (mesmo princípio dos chips e do frontmatter).
- Convive com o que já existe: chips de emoji/wikilink, autocomplete `/` `@` `#`, debounce de autosave.

### 3. Casca de ferramenta / layout (anti-"blé")
- **Data como herói:** número grande mono no topo do editor (`sex 28 maio·2026`) — dá o "abri o diário".
- **Statusbar** estilo VSCode no rodapé: path do nó · contador de palavras · estado salvo · filetype.
- **Topbar mono** discreta: nome do vault, `⌘K`, relógio, toggle de tema.
- **Matar cards flutuantes:** painéis full-bleed, divisória 1px dura. Sidebar e painel direito densos.
- **Heatmap de atividade** (estilo GitHub) na sidebar — ritual de diário, reconhecível pra dev. _(Visual nesta fase; alimentar com dados reais pode ficar pra fase posterior.)_

### 4. Command palette + atalhos (vibe VSCode)
- **`⌘K`** abre command palette: filtro por texto, navegação `↑`/`↓`, `Enter` executa, `Esc` fecha.
- Comandos: alternar tema, alternar sidebar (`⌘B`), alternar painel direito (`⌘J`), modo foco (`⌘.`, esconde ambos os painéis), ir para Hoje/Daily/Home, nova nota, buscar nota, **trocar/fechar/reabrir vault**.
- Toggles de painel e modo foco alteram só layout (classes no shell), sem mexer em dados.

### 5. Home minimalista + re-grant de baixa fricção
- A Home (escolher vault) é **porta de passagem**, não destino — recebe budget mínimo. Mantém-se o gate limpo do wireframe.
- **Operações de vault são comandos**, não uma tela de gestão dedicada (ver objetivo 4).
- Quando há handle recente mas falta permissão da sessão: avaliar **banner/toast sobre o Daily** ("reautorizar vault" → 1 clique) em vez de cair na Home — menos fricção. _(Pode ficar opcional se complicar o gate atual.)_

### 6. Persistência de preferências
- Lembrar **tema** e **estado de layout** (sidebar/painel/foco) entre sessões.
- Guardar em **IndexedDB** (regra do projeto: nada de `localStorage`/`sessionStorage`). Pode ser um store novo (`prefs`) no mesmo DB do handle, ou `meta/settings.json` quando o vault estiver aberto. Aplicar `data-theme` no `<html>` no boot, antes do primeiro paint, pra evitar flash.

## Dados / contratos importantes

- **Fontes:** Fira Code (`--font-mono`) no cromo, labels, datas e editor; corpo de prosa permanece sans (Plus Jakarta) — decisão atual, revisável.
- **Tokens:** todos os componentes consomem utilities semânticas; nenhuma cor literal nova em JSX.
- **Live Preview ≠ alteração de disco.** O markdown salvo é idêntico ao que o parser da Fase 1 espera; nenhuma decoração reserializa conteúdo.
- **Estado de UI** (tema, layout) é UI-only → vive no Zustand (`uiStore`), persistido em IndexedDB. Não confundir com estado de vault/tasks.
- Wireframe de referência (2 temas + palette + modo foco): [`../wireframe.html`](../wireframe.html).

## Entregável (definição de pronto)

- [x] Dois temas (`default`, `dracula-soft`) trocáveis, com todos os componentes reagindo (zero cor hardcoded restante).
- [x] Editor renderiza markdown ao vivo (headings, `---`, ênfase, listas, código) com markdown cru revelado na linha do cursor; disco continua markdown exato (round-trip da Fase 1 intacto).
- [x] Data-herói, statusbar e topbar presentes; glass/blur/orbs/pulse removidos.
- [x] `⌘K` palette funcional com os comandos listados; `⌘B`/`⌘J`/`⌘.` operam o layout.
- [x] Tema e layout persistem entre sessões (IndexedDB), sem flash no boot.
- [x] Home enxuta; operações de vault acessíveis por comando.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test:run` e `pnpm build` verdes.

## Riscos

- **Live Preview corromper markdown:** esconder marcadores e renderizar headings/hr são decorações visuais; o doc subjacente não pode mudar. Testar round-trip (digitar → salvar → reler) e o reveal-on-cursor em todos os tipos de bloco.
- **Performance de decorações:** dirigir por syntax tree e decorar só o viewport; não recalcular o documento inteiro a cada tecla. Conviver com o `chipPlugin` existente sem duplicar passes.
- **Sweep de tokens incompleto:** qualquer cor literal esquecida não troca de tema — varrer com grep e revisar nos 2 temas.
- **Flash de tema no boot:** aplicar `data-theme` antes do React montar (script inline ou no `index.html`).
- **Escopo inchar:** drag/reposição de painéis estilo VSCode está **fora** desta fase (só toggles + modo foco). Heatmap com dados reais e re-grant via toast são "nice to have" — não bloqueiam o pronto.

## Fora de escopo

- Reposicionar/arrastar painéis (só esconder/mostrar + modo foco).
- Responsivo/mobile e tema claro (ficam na Fase 5 — Polimento).
- Funcionalidade de domínio nova (notas livres, backlinks → Fase 3).
