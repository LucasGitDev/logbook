# Fase 5 — Polimento

> **UX, mobile e git flow.** Nenhum objetivo aqui bloqueia outro — ordem livre.

## Objetivo

Levar o app de funcional a agradável de usar todo dia: tema, layout responsivo, integração com git e atalhos de teclado.

## Objetivos específicos

### 1. Tema — light / dark
- Alternância light/dark.
- Persistir preferência em `meta/settings.json` (não `localStorage`).
- Tailwind v4: dark via classe/variável.

### 2. Mobile — layout responsivo
- Sidebar colapsável.
- Editor e listas usáveis em tela pequena.
- Nota: File System Access API tem suporte limitado em mobile — degradar com elegância.

### 3. Git flow — vault como repositório
- Mostrar status do vault como repo git (se for um).
- Atalhos pra commit/push? Ou só instruções? **Decidir escopo** (sem backend, git roda fora do browser — provavelmente só documentação + diffs legíveis).

### 4. Atalhos de teclado
- Nova task, marcar feita, navegar dias, busca rápida.
- Command palette (opcional).

## Dados / contratos importantes

- `meta/settings.json` guarda preferências (tema, etc.) — derivado/persistido, não fonte de tasks.
- Git não roda no browser: integração é informativa (diffs, status), ação real é no terminal do usuário.

## Entregável (definição de pronto)

- [ ] Tema light/dark alterna e persiste.
- [ ] Layout usável em mobile (com aviso sobre limitação de File System Access).
- [ ] Git flow definido (escopo documentado, mínimo: vault git-friendly já entregue nas fases anteriores).
- [ ] Atalhos principais funcionam.
- [ ] App pronto pra uso diário real, bonito e sem fricção.

## Riscos

- **File System Access em mobile**: suporte fraco/inexistente. Definir fallback ou avisar claramente.
- **Escopo do git flow**: fácil virar feature grande sem backend. Manter mínimo (informativo).
