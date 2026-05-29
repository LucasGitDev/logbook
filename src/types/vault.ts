// Tipos do vault — fonte de verdade para todo o app

// ─── Task ────────────────────────────────────────────────────────────────────

export type TaskStatus = "open" | "done";

export interface Task {
	id: string; // hash estável: origem + posição no arquivo
	text: string; // texto sem marcadores
	status: TaskStatus;
	createdDate: string; // YYYY-MM-DD — dia onde a task foi escrita
	scheduledDate?: string; // 📅 YYYY-MM-DD
	project?: string; // #tag
	sourceFile: string; // caminho relativo ao vault (ex: daily/2026-05-28/notes.md)
	sourceLine: number; // linha no arquivo original (para reescrita bidirecional)
}

// ─── Agenda ──────────────────────────────────────────────────────────────────

export interface AgendaItem {
	id: string;
	text: string;
	date: string; // 🗓️ YYYY-MM-DD
	time: string; // ⏰ HH:MM
	durationMin?: number; // ⏱️ em minutos
	status: TaskStatus;
	sourceFile: string;
	sourceLine: number;
}

// ─── Note (nó) ───────────────────────────────────────────────────────────────

export type NoteType = "daily" | "note";

export interface Note {
	id: string; // ULID do frontmatter — estável no rename
	title: string;
	type: NoteType;
	tags: string[];
	created: string; // YYYY-MM-DD
	aliases: string[];
	path: string; // caminho relativo ao vault
	links: string[]; // [[nomes]] que este nó aponta (saída)
	backlinks: string[]; // derivado — preenchido pelo indexer, vazio no parse
}

// ─── Daily ───────────────────────────────────────────────────────────────────

export interface DailyIndex {
	date: string; // YYYY-MM-DD
	scheduledTaskIds: string[];
	createdTaskIds: string[];
}

// ─── Meta ────────────────────────────────────────────────────────────────────

export interface Project {
	tag: string; // ex: "trabalho", "infra"
	color?: string; // hex opcional para UI
}

export interface VaultMeta {
	schemaVersion: number;
	lastOpened: string; // ISO datetime
}

// Grafo de links derivado: nome do nó alvo ([[nome]]) → caminhos dos nós que
// apontam pra ele (backlinks). Reconstruído a cada scan, nunca no frontmatter.
export type LinkGraph = Record<string, string[]>;

// ─── Estado global do app ────────────────────────────────────────────────────

export interface VaultState {
	rootHandle: FileSystemDirectoryHandle | null;
	tasks: Task[];
	agendaItems: AgendaItem[];
	projects: Project[];
	notes: Note[];
	links: LinkGraph;
	isLoaded: boolean;
}
