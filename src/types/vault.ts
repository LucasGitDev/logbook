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

// ─── Estado global do app ────────────────────────────────────────────────────

export interface VaultState {
	rootHandle: FileSystemDirectoryHandle | null;
	tasks: Task[];
	agendaItems: AgendaItem[];
	projects: Project[];
	isLoaded: boolean;
}
