import { describe, expect, it } from "vitest";
import { parseNoteContent } from "./indexer";
import { setTaskStatus } from "./parser";

describe("Round-trip Markdown Preservation", () => {
	it("preserva frontmatter e outras linhas byte-a-byte ao alterar checkbox", () => {
		const rawMarkdown = `---
id: 01HZX3QK7M8P
title: Reunião Diária
type: daily
created: 2026-05-28
tags: [trabalho, status]
---

Aqui está o corpo da nota com texto.

- [ ] Task 1 com projeto #infra 📅 2026-05-28
- [ ] Task de agenda 🗓️ 2026-05-28 ⏰ 14:00 ⏱️ 30min
- [x] Task ja concluida 📅 2026-05-27

Outro parágrafo no final.
`;

		// 1. Parseia a nota
		const parsed = parseNoteContent("daily/2026-05-28/notes.md", rawMarkdown);
		expect(parsed.tasks).toHaveLength(2); // Task 1 e Task ja concluida (agenda_item fica em agenda)
		expect(parsed.agenda).toHaveLength(1); // Task de agenda

		// Encontra a Task 1
		const task1 = parsed.tasks.find((t) => t.text.includes("Task 1"));
		expect(task1).toBeDefined();
		if (!task1) throw new Error("Task 1 não encontrada");
		expect(task1.sourceLine).toBe(11); // Linha 11 (1-based)
		expect(task1.status).toBe("open");

		// 2. Modifica a linha correspondente simulando o comportamento de useToggleTask
		const lines = rawMarkdown.split(/\r?\n/);
		const targetLineIndex = task1.sourceLine - 1;

		// Verifica se a linha original é o que esperamos
		expect(lines[targetLineIndex]).toBe(
			"- [ ] Task 1 com projeto #infra 📅 2026-05-28",
		);

		// Altera o status da linha
		const lineToChange = lines[targetLineIndex] ?? "";
		lines[targetLineIndex] = setTaskStatus(lineToChange, "done");

		// Verifica se a linha foi alterada corretamente
		expect(lines[targetLineIndex]).toBe(
			"- [x] Task 1 com projeto #infra 📅 2026-05-28",
		);

		// Junta as linhas de volta
		const updatedMarkdown = lines.join("\n");

		// 3. Verifica se a modificação preservou todo o resto do documento exatamente
		const expectedMarkdown = `---
id: 01HZX3QK7M8P
title: Reunião Diária
type: daily
created: 2026-05-28
tags: [trabalho, status]
---

Aqui está o corpo da nota com texto.

- [x] Task 1 com projeto #infra 📅 2026-05-28
- [ ] Task de agenda 🗓️ 2026-05-28 ⏰ 14:00 ⏱️ 30min
- [x] Task ja concluida 📅 2026-05-27

Outro parágrafo no final.
`;

		expect(updatedMarkdown).toBe(expectedMarkdown);
	});
});
