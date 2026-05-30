// Task-nó (type: task): criação de tarefa como nó de primeira classe.
//
// Espelha notes.ts. Funções puras (path/conteúdo) testáveis; createTaskNode faz
// I/O (escreve o .md e reindexa). O arquivo é a fonte de verdade da task forte:
// status + 📅 + #projeto numa LINHA CANÔNICA do corpo (reescrita byte a byte),
// prioridade/esforço no frontmatter. Título também no frontmatter.

import type { Note, Priority, TaskStatus } from "@/types/vault";
import { getLocalDateString } from "./dates";
import { injectFrontmatterLazy } from "./frontmatter";
import { reindexVault, type VaultIndex } from "./indexer";
import { sanitizeNoteName } from "./notes";
import { statusToChar } from "./parser";
import { fileExists, writeFile } from "./vault";

/** Caminho relativo do `.md` de uma task-nó, a partir do título. */
export function taskFilePath(title: string): string {
	return `tasks/${sanitizeNoteName(title)}.md`;
}

export interface NewTaskOptions {
	due?: string; // 📅 YYYY-MM-DD
	project?: string; // #tag (sem #)
	status?: TaskStatus; // default open
	priority?: Priority;
	effort?: string;
	created?: string; // YYYY-MM-DD
}

/** Monta a linha canônica de estado: `- [x] título 📅 due #projeto`. */
export function buildTaskLine(
	title: string,
	opts: NewTaskOptions = {},
): string {
	const char = statusToChar(opts.status ?? "open");
	let line = `- [${char}] ${title}`;
	if (opts.due) line += ` 📅 ${opts.due}`;
	if (opts.project) line += ` #${opts.project}`;
	return line;
}

/** Conteúdo inicial de uma task-nó: frontmatter lazy (type: task) + linha canônica. */
export function buildNewTaskContent(
	title: string,
	opts: NewTaskOptions = {},
): string {
	const clean = sanitizeNoteName(title);
	const body = `${buildTaskLine(clean, opts)}\n\n`;
	return injectFrontmatterLazy(body, {
		title: clean,
		type: "task",
		priority: opts.priority,
		effort: opts.effort,
		created: opts.created ?? getLocalDateString(),
	});
}

export interface CreateTaskResult {
	path: string;
	index: VaultIndex;
	node: Note | null;
}

/**
 * Cria uma task-nó sob `tasks/` e reindexa. Não sobrescreve se já existir.
 * Retorna o índice atualizado e o nó criado.
 */
export async function createTaskNode(
	root: FileSystemDirectoryHandle,
	title: string,
	opts: NewTaskOptions = {},
): Promise<CreateTaskResult> {
	const path = taskFilePath(title);
	if (!(await fileExists(root, path))) {
		await writeFile(root, path, buildNewTaskContent(title, opts));
	}
	const index = await reindexVault(root);
	const node = index.notes.find((n) => n.path === path) ?? null;
	return { path, index, node };
}
