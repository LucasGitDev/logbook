import { CompletionContext } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { customCompletionSource } from "./DailyEditor";

function ctxAfter(text: string, explicit = false) {
	const state = EditorState.create({ doc: text });
	return new CompletionContext(state, text.length, explicit);
}

describe("customCompletionSource", () => {
	it("`/` retorna o menu de marcadores (5 opções)", () => {
		const res = customCompletionSource(ctxAfter("/"));
		expect(res).not.toBeNull();
		expect(res?.options.length).toBe(5);
	});

	it("`/ag` filtra (Agendar)", () => {
		const res = customCompletionSource(ctxAfter("/ag"));
		expect(res?.options.some((o) => o.label.includes("Agendar"))).toBe(true);
	});

	it("texto sem trigger → null", () => {
		expect(customCompletionSource(ctxAfter("texto qualquer"))).toBeNull();
	});

	it("`@x` (sem notas) oferece criar nota", () => {
		const res = customCompletionSource(ctxAfter("@x"));
		expect(res?.options.some((o) => o.label.startsWith("Criar nota"))).toBe(
			true,
		);
	});
});
