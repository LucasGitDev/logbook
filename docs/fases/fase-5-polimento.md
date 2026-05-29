# Fase 5 — Polimento

> **UX, mobile e git flow.** Nenhum objetivo aqui bloqueia outro — ordem livre.

## Objetivo

Levar o app de funcional a agradável de usar todo dia: tema, layout responsivo, integração com git e atalhos de teclado.

## Objetivos específicos

### 1. Tema
- **Decisão resolvida:** sem tema *light*. O app tem **2 temas dark** (`default` + `dracula-soft`); a alternância já existe (Topbar + ⌘K).
- O que mudou nesta fase: a preferência de tema passou a persistir em **`meta/settings.json`** (não mais IndexedDB) — git-friendly e portável com o vault. `readSettings`/`writeSettings` em `vault.ts`; `uiStore.setTheme` grava no disco, `applyTheme` aplica ao abrir o vault. Estado de sessão de UI (abas, sidebar, foco) continua em IndexedDB.
- Tailwind v4: temas via `[data-theme]` + CSS variables.

### 2. Mobile — layout responsivo
- Breakpoint `md` (768px). Em `<md` a Sidebar vira **drawer overlay** com backdrop (toque fecha); hambúrguer no Topbar (`md:hidden`) abre/fecha. No 1º load mobile a sidebar começa fechada (`matchMedia`).
- Painel direito (agenda/backlinks) some em `<md` (editor ocupa a tela; tasks via `/inbox` e `/week`). `.editor` já é `flex:1; min-width:0`.
- **Degradação FS Access:** a home checa `isFileSystemAccessSupported()` e, se faltar (Firefox/Safari/mobile), mostra aviso "use Chrome/Edge/Opera no desktop" em vez dos botões de abrir.

### 3. Git flow — vault como repositório
- **Decisão resolvida: informativo mínimo.** Git não roda no browser; a UI só *lê*. `lib/git.ts` detecta `.git` e lê a branch de `.git/HEAD` (`parseGitHead` puro + `readGitStatus`); o Statusbar mostra a branch quando o vault é um repo. Commit/push continuam no terminal do usuário (vault é git-friendly: diffs legíveis, sem binários).

### 4. Atalhos de teclado
- Existentes: `⌘K` (palette), `⌘B` (sidebar), `⌘J` (painel), `⌘.` (foco).
- Novos: **`⌘⇧←` / `⌘⇧→`** navegam dia anterior/próximo no daily (ignorado enquanto se digita no editor); **`⌘N`** nova nota; **`⌘W`** fecha a aba ativa.
- ⚠️ `⌘N` e `⌘W` são reservados pelo navegador (nova janela / fechar aba) — implementados best-effort com `preventDefault`; se o navegador interceptar, os fallbacks confiáveis são o ⌘K/Sidebar (nova nota) e o botão `×` da aba (fechar).

## Dados / contratos importantes

- `meta/settings.json` guarda preferências (tema, etc.) — derivado/persistido, não fonte de tasks.
- Git não roda no browser: integração é informativa (diffs, status), ação real é no terminal do usuário.

## Entregável (definição de pronto)

- [x] Tema alterna (2 temas dark) e **persiste em `meta/settings.json`**.
- [x] Layout usável em mobile (sidebar drawer + hambúrguer; painel direito oculto) com aviso de File System Access na home.
- [x] Git flow definido: informativo mínimo (detecta repo + branch no Statusbar via `.git/HEAD`); ações reais no terminal.
- [x] Atalhos principais funcionam (`⌘⇧←/→`, `⌘N`, `⌘W` — com ressalva dos reservados).
- [x] App pronto pra uso diário real.

## Riscos

- **File System Access em mobile**: suporte fraco/inexistente. Definir fallback ou avisar claramente.
- **Escopo do git flow**: fácil virar feature grande sem backend. Manter mínimo (informativo).
