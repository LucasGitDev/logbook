import { describe, expect, it } from "vitest";
import {
	buildFrontmatterBlock,
	hasFrontmatter,
	injectFrontmatterLazy,
	parseFrontmatter,
	updateFrontmatterFields,
} from "./frontmatter";

const WITH_FM = `---
id: 01HZX3QK7M8P
title: Reunião de planejamento
type: note
tags: [trabalho, infra]
created: 2026-05-28
aliases: [planning]
---

Corpo da nota.

- [ ] Task aqui 📅 2026-05-30
`;

describe("hasFrontmatter", () => {
	it("detecta frontmatter no início", () => {
		expect(hasFrontmatter(WITH_FM)).toBe(true);
		expect(hasFrontmatter("# Sem frontmatter")).toBe(false);
		expect(hasFrontmatter("texto\n---\nnão conta")).toBe(false);
	});
});

describe("parseFrontmatter", () => {
	it("lê campos autorais e separa o corpo", () => {
		const { data, body } = parseFrontmatter(WITH_FM);
		expect(data.id).toBe("01HZX3QK7M8P");
		expect(data.title).toBe("Reunião de planejamento");
		expect(data.type).toBe("note");
		expect(data.tags).toEqual(["trabalho", "infra"]);
		expect(data.aliases).toEqual(["planning"]);
		expect(body.trimStart().startsWith("Corpo da nota.")).toBe(true);
	});

	it("arquivo sem frontmatter → data vazio, corpo intacto", () => {
		const raw = "# Só corpo\n";
		const { data, body } = parseFrontmatter(raw);
		expect(data).toEqual({});
		expect(body).toBe(raw);
	});
});

describe("buildFrontmatterBlock", () => {
	it("monta na ordem fixa e gera ULID quando id ausente", () => {
		const block = buildFrontmatterBlock({
			title: "Nova nota",
			type: "note",
			created: "2026-05-28",
		});
		const lines = block.split("\n");
		expect(lines[0]).toBe("---");
		expect(lines[1]).toMatch(/^id: [0-9A-HJKMNP-TV-Z]{26}$/); // ULID Crockford base32
		expect(lines[2]).toBe("title: Nova nota");
		expect(lines[3]).toBe("type: note");
		expect(lines[4]).toBe("created: 2026-05-28");
		expect(lines[5]).toBe("---");
	});

	it("respeita id fornecido e omite arrays vazios", () => {
		const block = buildFrontmatterBlock({
			id: "FIXED",
			title: "T",
			type: "daily",
			created: "2026-05-28",
			tags: [],
			aliases: [],
		});
		expect(block).toContain("id: FIXED");
		expect(block).not.toContain("tags:");
		expect(block).not.toContain("aliases:");
	});

	it("cita título com caractere problemático", () => {
		const block = buildFrontmatterBlock({
			title: "Sprint: planejamento",
			type: "note",
			created: "2026-05-28",
		});
		expect(block).toContain('title: "Sprint: planejamento"');
	});
});

describe("injectFrontmatterLazy", () => {
	it("arquivo COM frontmatter volta idêntico byte a byte", () => {
		const out = injectFrontmatterLazy(WITH_FM, {
			title: "outro",
			type: "note",
			created: "2026-01-01",
		});
		expect(out).toBe(WITH_FM);
	});

	it("arquivo SEM frontmatter recebe bloco + corpo preservado", () => {
		const raw = "# Meu dia\n\n- [ ] tarefa\n";
		const out = injectFrontmatterLazy(raw, {
			title: "2026-05-28",
			type: "daily",
			created: "2026-05-28",
		});
		expect(hasFrontmatter(out)).toBe(true);
		expect(out.endsWith(raw)).toBe(true); // corpo preservado byte a byte
		const { body } = parseFrontmatter(out);
		expect(body.trimStart()).toBe(raw); // só uma linha em branco antes do corpo
		expect(body.endsWith(raw)).toBe(true);
	});
});

describe("updateFrontmatterFields", () => {
	it("atualiza apenas os campos fornecidos preservando o ID e o corpo", () => {
		const raw = `---
id: MY-ID
title: Old Title
type: note
created: 2026-05-28
---
# Original body
- [ ] task
`;
		const out = updateFrontmatterFields(raw, {
			title: "New Title",
			aliases: ["alias1"],
		});
		const { data, body } = parseFrontmatter(out);
		expect(data.id).toBe("MY-ID");
		expect(data.title).toBe("New Title");
		expect(data.aliases).toEqual(["alias1"]);
		expect(data.created).toBeInstanceOf(Date);
		expect(out).toContain("created: 2026-05-28");
		expect(body.trim()).toBe("# Original body\n- [ ] task");
	});
});
