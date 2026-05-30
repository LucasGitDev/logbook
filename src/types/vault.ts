// Tipos do vault — fonte de verdade para todo o app

// ─── Task ────────────────────────────────────────────────────────────────────

export type TaskStatus = "open" | "doing" | "done" | "cancelled";

export type Priority = "high" | "medium" | "low";

export interface Task {
	id: string; // hash estável: origem + posição no arquivo
	text: string; // texto sem marcadores
	status: TaskStatus;
	createdDate: string; // YYYY-MM-DD — dia onde a task foi escrita
	scheduledDate?: string; // 📅 YYYY-MM-DD
	project?: string; // #tag
	sourceFile: string; // caminho relativo ao vault (ex: daily/2026-05-28/notes.md)
	sourceLine: number; // linha no arquivo original (para reescrita bidirecional)
	// ─── Task-nó (entidade forte): preenchidos só quando a linha canônica vem
	// de um arquivo `tasks/*.md` (type: task). Linha-task comum deixa vazios. ──
	nodeId?: string; // id (ULID) do nó da task — âncora de link / rota
	title?: string; // título do nó (frontmatter)
	priority?: Priority; // frontmatter
	effort?: string; // estimativa de esforço (frontmatter, ex: "2h")
}

// ─── Agenda ──────────────────────────────────────────────────────────────────

export interface AgendaItem {
	id: string;
	text: string;
	date: string; // 🗓️ YYYY-MM-DD
	time: string; // ⏰ HH:MM
	durationMin?: number; // ⏱️ em minutos
	project?: string; // #tag
	status: TaskStatus;
	sourceFile: string;
	sourceLine: number;
}

// ─── Note (nó) ───────────────────────────────────────────────────────────────

export type NoteType = "daily" | "note" | "task";

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

// ─── Settings (preferências persistidas — git-friendly, vai junto com o vault) ──

export type ThemeType = "default" | "dracula-soft";

export interface VaultSettings {
	theme: ThemeType;
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
