import { describe, expect, it } from "vitest";
import type { ParsedNote } from "./indexer";
import {
	buildDailyIndex,
	buildLinkGraph,
	buildProjectIndex,
	buildTaskIndex,
	dailyDateFromPath,
	parseNoteContent,
} from "./indexer";

const DAILY = "daily/2026-05-28/notes.md";

describe("dailyDateFromPath", () => {
	it("extrai data de nó do dia", () => {
		expect(dailyDateFromPath(DAILY)).toBe("2026-05-28");
	});
	it("nota livre → null", () => {
		expect(dailyDateFromPath("notes/projeto.md")).toBeNull();
	});
});

describe("parseNoteContent", () => {
	it("nó do dia: tipo daily, createdDate = data do path", () => {
		const raw = "# Hoje\n- [ ] Tarefa #infra\n- [ ] Futura 📅 2026-05-30\n";
		const n = parseNoteContent(DAILY, raw);
		expect(n.type).toBe("daily");
		expect(n.date).toBe("2026-05-28");
		expect(n.tasks).toHaveLength(2);
		expect(n.tasks[0]?.createdDate).toBe("2026-05-28");
	});

	it("nota livre: tipo note, título e createdDate do frontmatter", () => {
		const raw = `---
id: 01HZX
title: Projeto X
type: note
created: 2026-05-01
---

Liga em [[reuniao]] e [[plano]].
- [ ] Item
`;
		const n = parseNoteContent("notes/projeto-x.md", raw);
		expect(n.type).toBe("note");
		expect(n.title).toBe("Projeto X");
		expect(n.links).toEqual(["reuniao", "plano"]);
		expect(n.tasks[0]?.createdDate).toBe("2026-05-01");
	});

	it("título cai pro nome do arquivo sem frontmatter", () => {
		const n = parseNoteContent("notes/livre.md", "sem nada");
		expect(n.title).toBe("livre");
		expect(n.type).toBe("note");
	});

	it("task-nó: type task, 1ª linha-checkbox enriquecida com metadados", () => {
		const raw = `---
id: 01HZTASK
title: Deploy do app
type: task
priority: high
effort: 2h
created: 2026-05-29
---
- [/] Deploy do app 📅 2026-05-30 #infra

Descrição livre. Liga em [[infra-q2]].
`;
		const n = parseNoteContent("tasks/Deploy do app.md", raw);
		expect(n.type).toBe("task");
		const t = n.tasks[0];
		expect(t?.status).toBe("doing");
		expect(t?.nodeId).toBe("01HZTASK");
		expect(t?.title).toBe("Deploy do app");
		expect(t?.priority).toBe("high");
		expect(t?.effort).toBe("2h");
		expect(t?.scheduledDate).toBe("2026-05-30");
		expect(t?.project).toBe("infra");
		expect(n.links).toEqual(["infra-q2"]);
	});
});

describe("buildTaskIndex", () => {
	it("flatten de tasks de todos os nós", () => {
		const notes = [
			parseNoteContent(DAILY, "- [ ] a\n- [ ] b\n"),
			parseNoteContent("notes/x.md", "- [ ] c\n"),
		];
		expect(buildTaskIndex(notes)).toHaveLength(3);
	});
});

describe("buildProjectIndex", () => {
	it("projetos únicos na ordem de aparição", () => {
		const tasks = buildTaskIndex([
			parseNoteContent(DAILY, "- [ ] a #infra\n- [ ] b #app\n- [ ] c #infra\n"),
		]);
		expect(buildProjectIndex(tasks)).toEqual([
			{ tag: "infra" },
			{ tag: "app" },
		]);
	});

	it("inclui projetos vindos da agenda", () => {
		const note = parseNoteContent(
			DAILY,
			"- [ ] a #infra\n- [ ] 1:1 🗓️ 2026-05-28 ⏰ 10:00 #pessoas\n",
		);
		const tasks = buildTaskIndex([note]);
		const agenda = note.agenda;
		expect(buildProjectIndex(tasks, agenda)).toEqual([
			{ tag: "infra" },
			{ tag: "pessoas" },
		]);
	});
});

describe("buildLinkGraph", () => {
	it("mapeia alvo → caminhos que apontam (backlinks)", () => {
		const notes: ParsedNote[] = [
			parseNoteContent("notes/a.md", "ver [[alvo]]"),
			parseNoteContent("notes/b.md", "tambem [[alvo]] e [[outro]]"),
		];
		expect(buildLinkGraph(notes)).toEqual({
			alvo: ["notes/a.md", "notes/b.md"],
			outro: ["notes/b.md"],
		});
	});
});

describe("buildDailyIndex", () => {
	it("separa agendadas pra hoje de criadas hoje", () => {
		const tasks = buildTaskIndex([
			parseNoteContent(
				DAILY,
				"- [ ] criada hoje\n- [ ] pra depois 📅 2026-05-30\n",
			),
			parseNoteContent(
				"daily/2026-05-20/notes.md",
				"- [ ] de outro dia, agendada pra 28 📅 2026-05-28\n",
			),
		]);
		const idx = buildDailyIndex("2026-05-28", tasks);
		// 2 criadas no dia 28 (as duas do arquivo de 28)
		expect(idx.createdTaskIds).toHaveLength(2);
		// 1 agendada pro dia 28 (a do arquivo de 20)
		expect(idx.scheduledTaskIds).toHaveLength(1);
	});
});
