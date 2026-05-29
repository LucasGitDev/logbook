import { describe, expect, it } from "vitest";
import type { Task } from "@/types/vault";
import { filterTasksByProject, groupInboxTasks } from "./tasks";

function mk(partial: Partial<Task> & { id: string }): Task {
	return {
		text: partial.id,
		status: "open",
		createdDate: "2026-05-29",
		sourceFile: "daily/2026-05-29/notes.md",
		sourceLine: 1,
		...partial,
	};
}

const TODAY = "2026-05-29";

describe("filterTasksByProject", () => {
	const tasks = [
		mk({ id: "a", project: "infra" }),
		mk({ id: "b", project: "docs" }),
		mk({ id: "c" }),
	];

	it("null → todas", () => {
		expect(filterTasksByProject(tasks, null)).toHaveLength(3);
	});

	it("filtra pela tag exata", () => {
		expect(filterTasksByProject(tasks, "infra").map((t) => t.id)).toEqual([
			"a",
		]);
	});

	it("tag sem match → vazio", () => {
		expect(filterTasksByProject(tasks, "x")).toEqual([]);
	});
});

describe("groupInboxTasks", () => {
	it("separa overdue/today/upcoming/noDate e ignora feitas", () => {
		const tasks = [
			mk({ id: "late1", scheduledDate: "2026-05-27" }),
			mk({ id: "late2", scheduledDate: "2026-05-20" }),
			mk({ id: "now", scheduledDate: TODAY }),
			mk({ id: "soon", scheduledDate: "2026-06-02" }),
			mk({ id: "none" }),
			mk({ id: "done", scheduledDate: "2026-05-25", status: "done" }),
		];
		const g = groupInboxTasks(tasks, TODAY);
		// overdue ordenado por data crescente
		expect(g.overdue.map((t) => t.id)).toEqual(["late2", "late1"]);
		expect(g.today.map((t) => t.id)).toEqual(["now"]);
		expect(g.upcoming.map((t) => t.id)).toEqual(["soon"]);
		expect(g.noDate.map((t) => t.id)).toEqual(["none"]);
	});
});
