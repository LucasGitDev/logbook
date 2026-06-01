import { create } from "zustand";
import { loadPreference, savePreference } from "@/lib/idb";
import { writeSettings } from "@/lib/vault";
import type { ThemeType } from "@/types/vault";
import { useVaultStore } from "./vaultStore";

export type { ThemeType };

export type TabKind = "daily" | "note" | "task" | "inbox" | "week";

/** Aba aberta (estilo VSCode). `id` é único e estável por destino. */
export interface Tab {
	id: string; // ex: "daily:2026-05-29", "note:<id>", "inbox", "week"
	kind: TabKind;
	label: string;
	to: string; // rota destino (ex: "/daily/$date")
	params?: Record<string, string>;
}

interface UIStore {
	theme: ThemeType;
	sidebarOpen: boolean;
	panelOpen: boolean;
	focusMode: boolean;
	commandPaletteOpen: boolean;
	createModalOpen: boolean;
	createModalKind: "note" | "task";
	isInitialized: boolean;
	activeProject: string | null;
	openTabs: Tab[];
	activeTabId: string | null;
	setActiveProject: (project: string | null) => void;
	openTab: (tab: Tab) => void;
	closeTab: (id: string) => void;
	clearTabs: () => void;
	applyTheme: (theme: ThemeType) => void;
	setTheme: (theme: ThemeType) => void;
	toggleSidebar: () => void;
	togglePanel: () => void;
	toggleFocusMode: () => void;
	setCommandPaletteOpen: (open: boolean) => void;
	openCreateModal: (kind: "note" | "task") => void;
	setCreateModalOpen: (open: boolean) => void;
	initPreferences: () => Promise<void>;
}

export const useUIStore = create<UIStore>((set, get) => ({
	theme: "default",
	sidebarOpen: true,
	panelOpen: true,
	focusMode: false,
	commandPaletteOpen: false,
	createModalOpen: false,
	createModalKind: "note",
	isInitialized: false,
	activeProject: null,
	openTabs: [],
	activeTabId: null,

	setActiveProject: (activeProject) => set({ activeProject }),

	openTab: (tab) => {
		const tabs = get().openTabs;
		const existing = tabs.find((t) => t.id === tab.id);
		// Atualiza o label (ex: nota renomeada) e marca como ativa; adiciona se nova.
		const nextTabs = existing
			? tabs.map((t) => (t.id === tab.id ? { ...t, ...tab } : t))
			: [...tabs, tab];
		set({ openTabs: nextTabs, activeTabId: tab.id });
		savePreference("openTabs", nextTabs);
		savePreference("activeTabId", tab.id);
	},

	closeTab: (id) => {
		const tabs = get().openTabs.filter((t) => t.id !== id);
		const activeTabId =
			get().activeTabId === id
				? (tabs[tabs.length - 1]?.id ?? null)
				: get().activeTabId;
		set({ openTabs: tabs, activeTabId });
		savePreference("openTabs", tabs);
		savePreference("activeTabId", activeTabId);
	},

	clearTabs: () => {
		set({ openTabs: [], activeTabId: null });
		savePreference("openTabs", []);
		savePreference("activeTabId", null);
	},

	// Aplica o tema (DOM + store) sem persistir — usado ao carregar o vault.
	applyTheme: (theme) => {
		set({ theme });
		document.documentElement.setAttribute("data-theme", theme);
	},

	// Alterna e persiste em meta/settings.json (git-friendly). Estado de sessão
	// (abas, sidebar) continua em IDB; só preferências reais vão pro vault.
	setTheme: (theme) => {
		set({ theme });
		document.documentElement.setAttribute("data-theme", theme);
		const root = useVaultStore.getState().rootHandle;
		if (root) writeSettings(root, { theme });
	},

	toggleSidebar: () => {
		const next = !get().sidebarOpen;
		set({ sidebarOpen: next, focusMode: false });
		savePreference("sidebarOpen", next);
	},

	togglePanel: () => {
		const next = !get().panelOpen;
		set({ panelOpen: next, focusMode: false });
		savePreference("panelOpen", next);
	},

	toggleFocusMode: () => {
		const currentFocus = get().focusMode;
		const nextFocus = !currentFocus;
		if (nextFocus) {
			set({ sidebarOpen: false, panelOpen: false, focusMode: true });
		} else {
			set({ sidebarOpen: true, panelOpen: true, focusMode: false });
		}
		savePreference("focusMode", nextFocus);
	},

	setCommandPaletteOpen: (open) => {
		set({ commandPaletteOpen: open });
	},

	// Abre o modal de criação já no tipo escolhido (fecha o palette se aberto).
	openCreateModal: (kind) => {
		set({
			createModalOpen: true,
			createModalKind: kind,
			commandPaletteOpen: false,
		});
	},

	setCreateModalOpen: (open) => {
		set({ createModalOpen: open });
	},

	initPreferences: async () => {
		if (get().isInitialized) return;
		// Tema NÃO vem daqui: vive em meta/settings.json e é aplicado quando o
		// vault abre (applyTheme em _app.tsx). IDB guarda só estado de sessão.
		const sidebarOpen = await loadPreference<boolean>("sidebarOpen", true);
		const panelOpen = await loadPreference<boolean>("panelOpen", true);
		const focusMode = await loadPreference<boolean>("focusMode", false);
		const openTabs = await loadPreference<Tab[]>("openTabs", []);
		const activeTabId = await loadPreference<string | null>(
			"activeTabId",
			null,
		);

		set({
			sidebarOpen: focusMode ? false : sidebarOpen,
			panelOpen: focusMode ? false : panelOpen,
			focusMode,
			openTabs,
			activeTabId,
			isInitialized: true,
		});
	},
}));
