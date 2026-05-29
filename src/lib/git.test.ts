import { describe, expect, it } from "vitest";
import { parseGitHead } from "./git";

describe("parseGitHead", () => {
	it("extrai branch de ref attached", () => {
		expect(parseGitHead("ref: refs/heads/main\n")).toEqual({ branch: "main" });
	});

	it("branch com barra (feature)", () => {
		expect(parseGitHead("ref: refs/heads/feat/fase-5-polimento")).toEqual({
			branch: "feat/fase-5-polimento",
		});
	});

	it("HEAD destacado → short hash", () => {
		expect(parseGitHead("a086ddd9f8e7c6b5a4d3e2f1a086ddd9f8e7c6b5")).toEqual({
			branch: "a086ddd",
		});
	});

	it("vazio → {}", () => {
		expect(parseGitHead("")).toEqual({});
		expect(parseGitHead("   \n")).toEqual({});
	});

	it("lixo não-reconhecido → {}", () => {
		expect(parseGitHead("não é um HEAD válido")).toEqual({});
	});
});
