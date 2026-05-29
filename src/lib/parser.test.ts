import { describe, expect, it } from "vitest";
import type { AgendaItem, Task } from "@/types/vault";
import {
	cleanText,
	extractLinks,
	parseLine,
	parseNoteBody,
	setTaskScheduledDate,
	setTaskStatus,
} from "./parser";

const FILE = "daily/2026-05-28/notes.md";
const TODAY = "2026-05-28";

function task(line: string, lineNo = 1): Task {
	const r = parseLine(line, lineNo, FILE, TODAY);
	if (!r || "date" in r) throw new Error("esperava Task");
	return r;
}

function agenda(line: string, lineNo = 1): AgendaItem {
	const r = parseLine(line, lineNo, FILE, TODAY);
	if (!r || !("date" in r)) throw new Error("esperava AgendaItem");
	return r;
}

describe("parseLine — tasks", () => {
	it("task simples aberta", () => {
		const t = task("- [ ] Escrever relatório");
		expect(t.text).toBe("Escrever relatório");
		expect(t.status).toBe("open");
		expect(t.createdDate).toBe(TODAY);
		expect(t.scheduledDate).toBeUndefined();
		expect(t.sourceLine).toBe(1);
	});

	it("task agendada (📅)", () => {
		const t = task("- [ ] Revisar PR 📅 2026-05-30");
		expect(t.text).toBe("Revisar PR");
		expect(t.scheduledDate).toBe("2026-05-30");
	});

	it("task com projeto (#tag)", () => {
		const t = task("- [ ] Deploy 📅 2026-05-30 #infra");
		expect(t.text).toBe("Deploy");
		expect(t.scheduledDate).toBe("2026-05-30");
		expect(t.project).toBe("infra");
	});

	it("task concluída ([x])", () => {
		const t = task("- [x] Tarefa feita 📅 2026-05-29");
		expect(t.status).toBe("done");
		expect(t.text).toBe("Tarefa feita");
	});

	it("linha não-checkbox → null", () => {
		expect(parseLine("Texto solto", 1, FILE, TODAY)).toBeNull();
		expect(parseLine("- item de lista", 1, FILE, TODAY)).toBeNull();
		expect(parseLine("", 1, FILE, TODAY)).toBeNull();
	});

	it("id estável por sourceFile:sourceLine", () => {
		const a = task("- [ ] X", 3);
		const b = task("- [ ] Y", 3);
		expect(a.id).toBe(b.id); // mesma posição = mesmo id
		const c = task("- [ ] X", 4);
		expect(a.id).not.toBe(c.id);
	});
});

describe("parseLine — agenda", () => {
	it("agenda com horário e duração (🗓️ ⏰ ⏱️)", () => {
		const a = agenda("- [ ] 1:1 com gestor 🗓️ 2026-05-29 ⏰ 14:00 ⏱️ 30min");
		expect(a.text).toBe("1:1 com gestor");
		expect(a.date).toBe("2026-05-29");
		expect(a.time).toBe("14:00");
		expect(a.durationMin).toBe(30);
		expect(a.status).toBe("open");
	});

	it("🗓️ sem ⏰ não é agenda (vira task)", () => {
		const r = parseLine("- [ ] Algo 🗓️ 2026-05-29", 1, FILE, TODAY);
		expect(r && "date" in r).toBe(false);
	});

	it("agenda sem duração", () => {
		const a = agenda("- [ ] Café 🗓️ 2026-05-29 ⏰ 09:30");
		expect(a.time).toBe("09:30");
		expect(a.durationMin).toBeUndefined();
	});

	it("agenda com projeto (#tag)", () => {
		const a = agenda("- [ ] 1:1 🗓️ 2026-05-29 ⏰ 14:00 #pessoas");
		expect(a.text).toBe("1:1");
		expect(a.project).toBe("pessoas");
	});
});

describe("cleanText", () => {
	it("remove marcadores, datas e tags", () => {
		expect(cleanText("Deploy 📅 2026-05-30 #infra #urgente")).toBe("Deploy");
	});
});

describe("extractLinks", () => {
	it("extrai [[links]] dedupe na ordem", () => {
		const body = "Veja [[reuniao]] e [[plano-q2]]. De novo [[reuniao]].";
		expect(extractLinks(body)).toEqual(["reuniao", "plano-q2"]);
	});

	it("sem links → vazio", () => {
		expect(extractLinks("nada aqui")).toEqual([]);
	});
});

describe("setTaskStatus — round-trip", () => {
	it("[ ]→[x] preserva resto da linha", () => {
		const open = "- [ ] X 📅 2026-05-30 #t";
		const done = setTaskStatus(open, "done");
		expect(done).toBe("- [x] X 📅 2026-05-30 #t");
		expect(setTaskStatus(done, "open")).toBe(open);
	});

	it("preserva indentação", () => {
		expect(setTaskStatus("  - [ ] sub", "done")).toBe("  - [x] sub");
	});

	it("linha não-checkbox inalterada", () => {
		expect(setTaskStatus("texto", "done")).toBe("texto");
	});
});

describe("setTaskScheduledDate — carry-over", () => {
	it("substitui 📅 existente, preserva o resto", () => {
		const r = setTaskScheduledDate(
			"- [ ] Revisar PR 📅 2026-05-30 #infra",
			"2026-05-31",
		);
		expect(r).toBe("- [ ] Revisar PR 📅 2026-05-31 #infra");
	});

	it("acrescenta 📅 quando ausente", () => {
		expect(setTaskScheduledDate("- [ ] Sem data", "2026-05-30")).toBe(
			"- [ ] Sem data 📅 2026-05-30",
		);
	});

	it("preserva status feito ([x]) e [[links]]", () => {
		const r = setTaskScheduledDate(
			"- [x] Falar com [[gestor]] 📅 2026-05-29",
			"2026-06-01",
		);
		expect(r).toBe("- [x] Falar com [[gestor]] 📅 2026-06-01");
	});

	it("preserva indentação ao acrescentar", () => {
		expect(setTaskScheduledDate("  - [ ] sub", "2026-05-30")).toBe(
			"  - [ ] sub 📅 2026-05-30",
		);
	});

	it("linha não-checkbox inalterada", () => {
		expect(setTaskScheduledDate("texto solto", "2026-05-30")).toBe(
			"texto solto",
		);
	});
});

describe("parseNoteBody", () => {
	it("separa tasks, agenda e links com lineNo 1-based", () => {
		const body = [
			"# Dia",
			"- [ ] Task um",
			"- [x] Task dois 📅 2026-05-30 #infra",
			"- [ ] Reunião 🗓️ 2026-05-29 ⏰ 10:00 ⏱️ 60min",
			"Link pra [[outra-nota]]",
		].join("\n");
		const { tasks, agenda, links } = parseNoteBody(body, FILE, TODAY);
		expect(tasks).toHaveLength(2);
		expect(agenda).toHaveLength(1);
		expect(links).toEqual(["outra-nota"]);
		expect(tasks[0]?.sourceLine).toBe(2);
		expect(tasks[1]?.project).toBe("infra");
		expect(agenda[0]?.durationMin).toBe(60);
	});
});
