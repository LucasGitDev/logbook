import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { queryClient } from "./lib/queryClient";
import { routeTree } from "./routeTree.gen";
import { useUIStore } from "./stores/uiStore";

// Inicializa preferências de UI (tema, layout) do IndexedDB
useUIStore.getState().initPreferences();

// base path do deploy (GitHub Pages serve em /logbook/). Em dev = "".
const basepath = import.meta.env.BASE_URL.replace(/\/$/, "");
const router = createRouter({ routeTree, basepath });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	</StrictMode>,
);
