// Parser: markdown (corpo de um nó) → tasks / agenda / links.
//
// Funções PURAS, sem I/O. O markdown é a fonte de verdade; aqui só extraímos
// dados tipados e reescrevemos linhas preservando o resto byte a byte.
//
// Emojis como marcadores semânticos (formato de disco, nunca digitados à mão):
//   📅 task agendada · 🗓️+⏰ agenda (compromisso) · ⏱️ duração · #tag projeto

import type { AgendaItem, Task, TaskStatus } from "@/types/vault";

// Marcadores (codepoint-base, variation selector FE0F opcional).
const CALENDAR = "\u{1F4C5}"; // 📅
const SPIRAL = "\u{1F5D3}\u{FE0F}?"; // 🗓️
const ALARM = "\u{23F0}"; // ⏰
const STOPWATCH = "\u{23F1}\u{FE0F}?"; // ⏱️

const DATE = "(\\d{4}-\\d{2}-\\d{2})";
const TIME = "(\\d{1,2}:\\d{2})";

const CHECKBOX = /^(\s*)- \[([ xX])\]\s+(.*)$/;
const SCHEDULED_RE = new RegExp(`${CALENDAR}\\s*${DATE}`, "u");
const AGENDA_DATE_RE = new RegExp(`${SPIRAL}\\s*${DATE}`, "u");
const TIME_RE = new RegExp(`${ALARM}\\s*${TIME}`, "u");
const DURATION_RE = new RegExp(`${STOPWATCH}\\s*(\\d+)\\s*min`, "u");
const PROJECT_RE = /#([\p{L}\d_-]+)/u;
const LINK_RE = /\[\[([^\]]+)\]\]/gu;

// Para limpar o texto: remove todos os marcadores + seus valores.
const STRIP_RES: RegExp[] = [
	new RegExp(`${CALENDAR}\\s*${DATE}`, "gu"),
	new RegExp(`${SPIRAL}\\s*${DATE}`, "gu"),
	new RegExp(`${ALARM}\\s*${TIME}`, "gu"),
	new RegExp(`${STOPWATCH}\\s*\\d+\\s*min`, "gu"),
	/#[\p{L}\d_-]+/gu,
];

/** Hash determinístico FNV-1a 32-bit → base36. Sem dep, estável. */
function hashId(s: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0).toString(36);
}

/** Remove marcadores/valores e #tags, devolve o texto humano limpo. */
export function cleanText(checkboxBody: string): string {
	let t = checkboxBody;
	for (const re of STRIP_RES) {
		t = t.replace(re, "");
	}
	return t.replace(/\s+/g, " ").trim();
}

/**
 * Parseia uma linha do corpo. Não-checkbox → null.
 * 🗓️ E ⏰ presentes → AgendaItem; senão → Task.
 * `lineNo` é 1-based.
 */
export function parseLine(
	line: string,
	lineNo: number,
	sourceFile: string,
	createdDate: string,
): Task | AgendaItem | null {
	const m = CHECKBOX.exec(line);
	if (!m) return null;

	const statusChar = m[2];
	const body = m[3] ?? "";
	const status: TaskStatus = statusChar === " " ? "open" : "done";
	const id = hashId(`${sourceFile}:${lineNo}`);
	const text = cleanText(body);

	const agendaDate = AGENDA_DATE_RE.exec(line);
	const time = TIME_RE.exec(line);

	if (agendaDate && time) {
		const duration = DURATION_RE.exec(line);
		const item: AgendaItem = {
			id,
			text,
			date: agendaDate[1] ?? "",
			time: time[1] ?? "",
			status,
			sourceFile,
			sourceLine: lineNo,
		};
		if (duration) item.durationMin = Number(duration[1]);
		return item;
	}

	const scheduled = SCHEDULED_RE.exec(line);
	const project = PROJECT_RE.exec(line);
	const task: Task = {
		id,
		text,
		status,
		createdDate,
		sourceFile,
		sourceLine: lineNo,
	};
	if (scheduled) task.scheduledDate = scheduled[1];
	if (project) task.project = project[1];
	return task;
}

/** Todos os [[nome]] do corpo, dedupe preservando ordem de aparição. */
export function extractLinks(body: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const m of body.matchAll(LINK_RE)) {
		const name = m[1]?.trim();
		if (name && !seen.has(name)) {
			seen.add(name);
			out.push(name);
		}
	}
	return out;
}

/**
 * Reescreve SÓ o marcador da checkbox ([ ]↔[x]), preservando o resto da linha
 * (emojis, tags, espaços) byte a byte. Linha não-checkbox volta inalterada.
 */
export function setTaskStatus(line: string, status: TaskStatus): string {
	const mark = status === "done" ? "x" : " ";
	return line.replace(/^(\s*- \[)[ xX](\])/, `$1${mark}$2`);
}

/** Parseia o corpo inteiro de um nó: tasks, agenda e links de saída. */
export function parseNoteBody(
	body: string,
	sourceFile: string,
	createdDate: string,
): { tasks: Task[]; agenda: AgendaItem[]; links: string[] } {
	const tasks: Task[] = [];
	const agenda: AgendaItem[] = [];
	const lines = body.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const parsed = parseLine(lines[i] ?? "", i + 1, sourceFile, createdDate);
		if (!parsed) continue;
		if ("date" in parsed) agenda.push(parsed);
		else tasks.push(parsed);
	}
	return { tasks, agenda, links: extractLinks(body) };
}
