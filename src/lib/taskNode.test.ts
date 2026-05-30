import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "./frontmatter";
import { buildNewTaskContent, buildTaskLine, taskFilePath } from "./taskNode";

describe("taskFilePath", () => {
	it("sanitiza o título para um path em tasks/", () => {
		expect(taskFilePath("Deploy do app")).toBe("tasks/Deploy do app.md");
		expect(taskFilePath("infra/deploy")).toBe("tasks/infra-deploy.md");
	});
});

describe("buildTaskLine", () => {
	it("linha canônica com status, due e projeto", () => {
		expect(
			buildTaskLine("Deploy", {
				status: "doing",
				due: "2026-05-30",
				project: "infra",
			}),
		).toBe("- [/] Deploy 📅 2026-05-30 #infra");
	});

	it("status default open, sem markers opcionais", () => {
		expect(buildTaskLine("Algo")).toBe("- [ ] Algo");
	});
});

describe("buildNewTaskContent", () => {
	it("frontmatter type:task + prioridade/esforço + linha canônica", () => {
		const raw = buildNewTaskContent("Deploy", {
			due: "2026-05-30",
			project: "infra",
			priority: "high",
			effort: "2h",
			created: "2026-05-29",
		});
		const { data, body } = parseFrontmatter(raw);
		expect(data.type).toBe("task");
		expect(data.title).toBe("Deploy");
		expect(data.priority).toBe("high");
		expect(data.effort).toBe("2h");
		expect(body.trim()).toBe("- [ ] Deploy 📅 2026-05-30 #infra");
	});
});
