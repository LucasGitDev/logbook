import { describe, expect, it } from "vitest";
import { getLocalDateString } from "./dates";

describe("getLocalDateString", () => {
	it("formata uma data específica para YYYY-MM-DD", () => {
		// Meses no construtor de Date são 0-indexed (4 = Maio)
		const d = new Date(2026, 4, 28);
		expect(getLocalDateString(d)).toBe("2026-05-28");
	});

	it("formata corretamente meses e dias com dígito único (padding)", () => {
		const d = new Date(2026, 0, 5); // 5 de Janeiro
		expect(getLocalDateString(d)).toBe("2026-01-05");
	});

	it("formata datas no fim do ano", () => {
		const d = new Date(2026, 11, 31); // 31 de Dezembro
		expect(getLocalDateString(d)).toBe("2026-12-31");
	});
});
