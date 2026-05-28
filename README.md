# Diário de Bordo

App de diário de trabalho pessoal. Interface web que lê e escreve arquivos markdown reais na sua máquina via File System Access API.

## Como funciona

- Você escreve em markdown → o app detecta tasks e agendas automaticamente
- Os arquivos ficam salvos localmente em uma pasta da sua escolha
- Essa pasta pode ser um repositório git separado para versionamento
- Compatível com Obsidian: abra a mesma pasta lá quando quiser

## Requisitos

- Node.js 18+
- Chrome ou Edge (Firefox não suporta File System Access API)

## Setup

```bash
npm install
npm run dev
```

Ao abrir, o app pedirá permissão para acessar uma pasta no seu computador. Escolha ou crie a pasta que será sua vault.

## Vault como repositório separado

```bash
mkdir ~/diario-vault
cd ~/diario-vault
git init
git remote add origin git@github.com:seu-usuario/diario-vault.git
```

Aponte o app para essa pasta. Commit e push quando quiser versionar.

## Sintaxe de tasks no markdown

```markdown
- [ ] Tarefa simples
- [ ] Tarefa agendada 📅 2026-05-30
- [ ] Tarefa com projeto 📅 2026-05-30 #trabalho
- [x] Tarefa concluída 📅 2026-05-29

<!-- Agenda (compromisso com horário) -->
- [ ] Reunião de alinhamento 🗓️ 2026-05-30 ⏰ 14:00 ⏱️ 30min
```

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- File System Access API
