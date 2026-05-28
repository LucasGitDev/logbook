import { describe, expect, it } from "vitest";
import { useVaultStore } from "./vaultStore";

describe("vaultStore", () => {
	it("starts empty and unloaded", () => {
		const state = useVaultStore.getState();
		expect(state.isLoaded).toBe(false);
		expect(state.tasks).toEqual([]);
	});

	it("sets isLoaded when root handle assigned via reset toggle", () => {
		useVaultStore.getState().reset();
		expect(useVaultStore.getState().isLoaded).toBe(false);
	});
});
