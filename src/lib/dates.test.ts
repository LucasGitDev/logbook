import { describe, expect, it } from "vitest";
import { addDays, getLocalDateString } from "./dates";

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

describe("addDays", () => {
	it("soma 1 dia (amanhã)", () => {
		expect(addDays("2026-05-29", 1)).toBe("2026-05-30");
	});

	it("soma 7 dias (+1 semana)", () => {
		expect(addDays("2026-05-29", 7)).toBe("2026-06-05");
	});

	it("vira o mês", () => {
		expect(addDays("2026-05-31", 1)).toBe("2026-06-01");
	});

	it("vira o ano", () => {
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
	});

	it("aceita n negativo", () => {
		expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
	});
});
