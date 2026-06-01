/// <reference types="vitest/config" />
import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// GitHub Pages não tem rewrite de SPA: serve 404.html para rotas inexistentes.
// Copiar index.html → 404.html faz o deep-link / refresh em /daily/... carregar
// o app (que então roteia client-side) em vez de um 404 cru.
function spaFallback404(): Plugin {
	return {
		name: "spa-fallback-404",
		closeBundle() {
			copyFileSync("dist/index.html", "dist/404.html");
		},
	};
}

export default defineConfig(({ command }) => ({
	// Project page: assets servidos sob /logbook/. Dev fica na raiz.
	base: command === "build" ? "/logbook/" : "/",
	plugins: [
		tanstackRouter({ target: "react", autoCodeSplitting: true }),
		tailwindcss(),
		react(),
		nodePolyfills({ globals: { Buffer: true } }),
		spaFallback404(),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	test: {
		environment: "happy-dom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
	},
}));
