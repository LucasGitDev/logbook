// Indexer: reconstrói os meta/*.json e índices por dia a partir dos .md.
//
// Os JSON são SEMPRE derivados — apagar e reabrir reconstrói idêntico. Markdown
// é a fonte de verdade. As funções de build são puras (testáveis); só
// `reindexVault` faz I/O (lê os .md, escreve os JSON).

import type {
	AgendaItem,
	DailyIndex,
	LinkGraph,
	Note,
	NoteType,
	Project,
	Task,
} from "@/types/vault";
import { parseFrontmatter } from "./frontmatter";
import { parseNoteBody } from "./parser";
import { listNoteFiles, readFile, writeJson } from "./vault";

export interface ParsedNote extends Note {
	date: string | null; // YYYY-MM-DD se for nó do dia
	tasks: Task[];
	agenda: AgendaItem[];
}

const DAILY_PATH_RE = /^daily\/(\d{4}-\d{2}-\d{2})\//;

/** Extrai a data de um caminho de nó do dia, ou null. */
export function dailyDateFromPath(path: string): string | null {
	return DAILY_PATH_RE.exec(path)?.[1] ?? null;
}

/** Calcula quantas linhas o bloco de frontmatter ocupa (incluindo o --- final). */
export function calculateFrontmatterLines(raw: string): number {
	if (!raw.startsWith("---")) return 0;
	const lines = raw.split(/\r?\n/);
	const closingIndex = lines.indexOf("---", 1);
	if (closingIndex === -1) return 0;
	return closingIndex + 1;
}

/** Parseia o conteúdo bruto de um nó (frontmatter + corpo) → ParsedNote. Puro. */
export function parseNoteContent(path: string, raw: string): ParsedNote {
	const { data, body } = parseFrontmatter(raw);
	const date = dailyDateFromPath(path);
	const createdDate = date ?? coerceDate(data.created);
	const { tasks, agenda, links } = parseNoteBody(body, path, createdDate);
	const type: NoteType =
		date || data.type === "daily"
			? "daily"
			: data.type === "task"
				? "task"
				: "note";
	const id = typeof data.id === "string" ? data.id : "";
	const title =
		typeof data.title === "string" && data.title
			? data.title
			: fileBaseName(path);

	// Ajusta os números de linha se houver frontmatter
	const offset = calculateFrontmatterLines(raw);
	if (offset > 0) {
		for (const t of tasks) {
			t.sourceLine += offset;
		}
		for (const a of agenda) {
			a.sourceLine += offset;
		}
	}

	// Task-nó: a 1ª linha-checkbox é a canônica de estado. Enriquece-a com os
	// metadados do nó (id/título/prioridade/esforço) p/ entrar no índice global
	// como entidade forte (Inbox/Semana mostram chips, clique abre a rota do nó).
	if (type === "task" && tasks[0]) {
		tasks[0].nodeId = id;
		tasks[0].title = title;
		const priority = data.priority;
		if (priority === "high" || priority === "medium" || priority === "low") {
			tasks[0].priority = priority;
		}
		if (typeof data.effort === "string" && data.effort) {
			tasks[0].effort = data.effort;
		}
	}

	return {
		id,
		title,
		type,
		tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
		created: createdDate,
		aliases: Array.isArray(data.aliases) ? (data.aliases as string[]) : [],
		path,
		links,
		backlinks: [],
		date,
		tasks,
		agenda,
	} as ParsedNote;
}

// gray-matter (js-yaml) parseia `created: 2026-05-01` como Date — normaliza p/ YYYY-MM-DD.
function coerceDate(value: unknown): string {
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	if (typeof value === "string") return value;
	return "";
}

function fileBaseName(path: string): string {
	const last = path.split("/").pop() ?? path;
	return last.replace(/\.md$/, "");
}

// ─── Builders puros ─────────────────────────────────────────────────────────────

/** Índice global de tasks (flatten de todos os nós). */
export function buildTaskIndex(notes: ParsedNote[]): Task[] {
	return notes.flatMap((n) => n.tasks);
}

/** Projetos únicos vistos em tasks e agenda (ordem de aparição). */
export function buildProjectIndex(
	tasks: Task[],
	agenda: AgendaItem[] = [],
): Project[] {
	const seen = new Set<string>();
	const out: Project[] = [];
	for (const item of [...tasks, ...agenda]) {
		if (item.project && !seen.has(item.project)) {
			seen.add(item.project);
			out.push({ tag: item.project });
		}
	}
	return out;
}

/** Grafo de backlinks: alvo do [[link]] → caminhos que apontam pra ele. */
export function buildLinkGraph(notes: ParsedNote[]): LinkGraph {
	const graph: LinkGraph = {};
	for (const note of notes) {
		for (const target of note.links) {
			const sources = graph[target] ?? [];
			sources.push(note.path);
			graph[target] = sources;
		}
	}
	return graph;
}

/** Índice do dia: tasks agendadas pra ele e tasks criadas nele. */
export function buildDailyIndex(date: string, tasks: Task[]): DailyIndex {
	const scheduledTaskIds: string[] = [];
	const createdTaskIds: string[] = [];
	for (const t of tasks) {
		if (t.scheduledDate === date) scheduledTaskIds.push(t.id);
		if (t.createdDate === date) createdTaskIds.push(t.id);
	}
	return { date, scheduledTaskIds, createdTaskIds };
}

// ─── Scan + escrita (I/O) ───────────────────────────────────────────────────────

export interface VaultIndex {
	notes: ParsedNote[];
	tasks: Task[];
	projects: Project[];
	links: LinkGraph;
	agendaItems: AgendaItem[];
}

/**
 * Escaneia todos os `.md` (`daily/` + `notes/`), reconstrói os índices do zero
 * e escreve os JSON de meta e os tasks.json / agenda.json de cada dia.
 */
export async function reindexVault(
	root: FileSystemDirectoryHandle,
): Promise<VaultIndex> {
	const files = await listNoteFiles(root);
	const notes: ParsedNote[] = [];
	for (const path of files) {
		const raw = await readFile(root, path);
		if (raw === null) continue;
		notes.push(parseNoteContent(path, raw));
	}

	const tasks = buildTaskIndex(notes);
	const agendaItems = notes.flatMap((n) => n.agenda);
	const projects = buildProjectIndex(tasks, agendaItems);
	const links = buildLinkGraph(notes);

	await writeJson(root, "meta/tasks.json", tasks);
	await writeJson(root, "meta/projects.json", projects);
	await writeJson(root, "meta/links.json", links);

	const dates = new Set<string>();
	for (const note of notes) if (note.date) dates.add(note.date);
	for (const date of dates) {
		await writeJson(
			root,
			`daily/${date}/tasks.json`,
			buildDailyIndex(date, tasks),
		);
		await writeJson(
			root,
			`daily/${date}/agenda.json`,
			agendaItems.filter((a) => a.date === date),
		);
	}

	return { notes, tasks, projects, links, agendaItems };
}
