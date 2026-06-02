# Fase 7 — Anexos & embeds (imagens)

> **Colar imagens do clipboard direto no editor.** Depende do I/O do vault (Fase 1) e do padrão de block-decoration do editor (`hrField`/`frontmatterFold`, Fase 2.5/6). Estabelece o **pipeline de anexos** que a Fase 8 (desenho) reusa.

## Objetivo

Permitir colar uma imagem (⌘V) no editor e tê-la persistida como arquivo real no vault, embeddada inline por wikilink (`![[...]]`), renderizada ao vivo no Live Preview. Define a arquitetura de pastas de anexos e o contrato de I/O binário — fundação de qualquer embed futuro.

## Decisões travadas

- **Imagem é binário aceito.** Não há formato-texto pra um PNG colado. `.gitattributes` marca `assets/**` como binário (e habilita Git LFS opcional pelo usuário). Princípio "sem binários" cede só onde é fisicamente inevitável; desenho (Fase 8) continua texto.
- **Layout:** `vault/assets/YYYY/MM/<sha256>.<ext>`. Subpasta por mês evita diretório com milhares de arquivos.
- **Nome = content-hash (sha256 hex).** Dedupe grátis (mesma imagem colada 2× → 1 arquivo), rename-safe, estável. Web Crypto: `crypto.subtle.digest("SHA-256", buf)`.
- **Sintaxe no disco:** `![[assets/2026/06/<hash>.png]]` — embed estilo Obsidian. **Nunca digitado à mão**: o handler de paste insere.

## Modelo

```markdown
Texto do dia.

![[assets/2026/06/9f3a...c1.png]]    # embed — inserido pelo paste, render = imagem inline

Mais texto.
```

O `![[...]]` fica no corpo byte a byte (zero impacto em save/parse/frontmatter). Render é só visual.

## Contratos novos

| Onde | O quê | Mecânica |
|---|---|---|
| `src/lib/vault.ts` | `writeBinary(root, path, blob)` / `readBinary(root, path): Promise<Blob>` | ÚNICO lugar que toca `FileSystem*`. `createWritable().write(blob)` |
| `src/lib/assets.ts` (novo) | `hashBlob(blob): Promise<string>`, `assetPath(hash, ext): string`, `saveAsset(root, blob): Promise<string>` | hash → caminho `assets/YYYY/MM/<hash>.<ext>`; se já existe, reusa (dedupe), senão escreve |
| `src/components/DailyEditor.tsx` | handler de paste + `imageEmbedField` (StateField, block widget) | paste detecta `clipboardData.files`/items `image/*` → `saveAsset` → `dispatch` insere `![[path]]`; widget casa `![[...png/jpg/...]]` e renderiza `<img>` via blob URL |

**Ciclo do blob URL:** cache por caminho; `URL.revokeObjectURL` no `destroy()` do widget pra não vazar memória.

## Fluxos

- **Colar:** ⌘V com imagem no clipboard → `saveAsset(root, blob)` (hash, dedupe, escreve) → editor insere `![[caminho]]` na posição do cursor → widget renderiza inline.
- **Render:** `imageEmbedField` casa embeds de extensão de imagem; carrega `readBinary` → blob URL → `<img>` (lazy, com placeholder enquanto carrega).
- **Reindex:** `![[...]]` de imagem **não** é link de grafo — indexer ignora (ou marca como `embed`, não `backlink`). Decidir: não poluir `links.json` com anexos.

## Entregável (definição de pronto)

- [ ] `vault.ts` lê/escreve binário; `assets.ts` com hash + dedupe + layout `YYYY/MM`.
- [ ] Colar imagem no editor persiste o arquivo e insere `![[...]]` automático (sem digitar).
- [ ] Embed de imagem renderiza inline no Live Preview (blob URL, revogado no destroy).
- [ ] `.gitattributes` marca `assets/**` binário; vault continua abrindo sem o arquivo (broken-embed mostra placeholder, não quebra).
- [ ] Indexer não trata embed de imagem como backlink.

## Fora de escopo

- Redimensionar/editar imagem, alt text, caption.
- Arrastar-e-soltar arquivo (só paste por ora).
- Galeria/navegador de anexos; limpeza de órfãos (asset sem referência).
- Vídeo/áudio/PDF embed (mesma fundação, fase futura).

## Riscos

- **Vazamento de blob URL** se o widget não revogar — mitigar com cache + revoke no destroy.
- **Transient activation** no `requestPermission`: paste é gesto do usuário, mas `await hashBlob` antes do write pode não importar (write não exige activation, só `showDirectoryPicker`). Validar.
- **Órfãos:** deletar o `![[...]]` não apaga o arquivo. Aceitável por ora (dedupe limita o estrago); limpeza fica fora de escopo.
- **Hash colisão** — sha256, desprezível.
