// Notas livres (type: note): criação e resolução de links.
//
// Funções puras (sanitize/path/conteúdo + resolveLinkTarget) são testáveis em
// happy-dom; createNote faz I/O (escreve o .md e reindexa).

import type { Note } from "@/types/vault";
import { getLocalDateString } from "./dates";
import { injectFrontmatterLazy } from "./frontmatter";
import { reindexVault, type VaultIndex } from "./indexer";
import { fileExists, writeFile } from "./vault";

/** Normaliza um nome de nota para um filename seguro (sem barras, sem ponto inicial). */
export function sanitizeNoteName(name: string): string {
	return name
		.trim()
		.replace(/[\\/]+/g, "-")
		.replace(/^\.+/, "")
		.trim();
}

/** Caminho relativo do `.md` de uma nota livre, a partir do nome. */
export function noteFilePath(name: string): string {
	return `notes/${sanitizeNoteName(name)}.md`;
}

/** Conteúdo inicial de uma nota livre, com frontmatter (lazy) `type: note`. */
export function buildNewNoteContent(
	name: string,
	created = getLocalDateString(),
): string {
	const clean = sanitizeNoteName(name);
	return injectFrontmatterLazy(`# ${clean}\n\n`, {
		title: clean,
		type: "note",
		created,
	});
}

/**
 * Resolve um nome de wikilink (título ou alias) para um nó do vault,
 * case-insensitive. Não acha → null.
 */
export function resolveLinkTarget(
	notes: Note[],
	targetName: string,
): Note | null {
	const lower = targetName.trim().toLowerCase();
	return (
		notes.find((n) => {
			if (n.title.toLowerCase() === lower) return true;
			if (n.aliases.some((alias) => alias.toLowerCase() === lower)) return true;
			return false;
		}) ?? null
	);
}

export interface CreateNoteResult {
	path: string;
	index: VaultIndex;
	note: Note | null;
}

/**
 * Cria uma nota livre sob `notes/` e reindexa. Se o arquivo já existir, não
 * sobrescreve (só reindexa). Retorna o índice atualizado e o nó criado.
 */
export async function createNote(
	root: FileSystemDirectoryHandle,
	name: string,
): Promise<CreateNoteResult> {
	const path = noteFilePath(name);
	if (!(await fileExists(root, path))) {
		await writeFile(root, path, buildNewNoteContent(name));
	}
	const index = await reindexVault(root);
	const note = index.notes.find((n) => n.path === path) ?? null;
	return { path, index, note };
}
