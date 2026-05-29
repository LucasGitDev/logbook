import { describe, expect, it } from "vitest";
import type { Note } from "@/types/vault";
import {
	buildNewNoteContent,
	noteFilePath,
	resolveLinkTarget,
	sanitizeNoteName,
} from "./notes";

function makeNote(partial: Partial<Note>): Note {
	return {
		id: "01ABC",
		title: "Untitled",
		type: "note",
		tags: [],
		created: "2026-05-29",
		aliases: [],
		path: "notes/untitled.md",
		links: [],
		backlinks: [],
		...partial,
	};
}

describe("sanitizeNoteName", () => {
	it("trim e remove barras", () => {
		expect(sanitizeNoteName("  minha nota  ")).toBe("minha nota");
		expect(sanitizeNoteName("a/b\\c")).toBe("a-b-c");
	});

	it("remove ponto(s) inicial(is)", () => {
		expect(sanitizeNoteName("...oculta")).toBe("oculta");
	});
});

describe("noteFilePath", () => {
	it("monta caminho sob notes/ com nome sanitizado", () => {
		expect(noteFilePath("Plano Q2")).toBe("notes/Plano Q2.md");
		expect(noteFilePath("a/b")).toBe("notes/a-b.md");
	});
});

describe("buildNewNoteContent", () => {
	it("injeta frontmatter type:note com título e data", () => {
		const out = buildNewNoteContent("Arquitetura", "2026-05-29");
		expect(out.startsWith("---\n")).toBe(true);
		expect(out).toContain("type: note");
		expect(out).toContain("title: Arquitetura");
		expect(out).toContain("created: 2026-05-29");
		// corpo preservado
		expect(out).toContain("# Arquitetura");
	});
});

describe("resolveLinkTarget", () => {
	const notes = [
		makeNote({ id: "1", title: "Arquitetura", path: "notes/Arquitetura.md" }),
		makeNote({
			id: "2",
			title: "Planejamento",
			aliases: ["planning", "plano-q2"],
			path: "notes/Planejamento.md",
		}),
	];

	it("casa por título (case-insensitive + trim)", () => {
		expect(resolveLinkTarget(notes, "  arquitetura ")?.id).toBe("1");
	});

	it("casa por alias", () => {
		expect(resolveLinkTarget(notes, "planning")?.id).toBe("2");
		expect(resolveLinkTarget(notes, "PLANO-Q2")?.id).toBe("2");
	});

	it("sem match → null", () => {
		expect(resolveLinkTarget(notes, "inexistente")).toBeNull();
	});
});
