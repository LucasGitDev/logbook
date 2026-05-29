import { create } from "zustand";
import { loadPreference, savePreference } from "@/lib/idb";

export type ThemeType = "default" | "dracula-soft";

interface UIStore {
	theme: ThemeType;
	sidebarOpen: boolean;
	panelOpen: boolean;
	focusMode: boolean;
	commandPaletteOpen: boolean;
	isInitialized: boolean;
	setTheme: (theme: ThemeType) => void;
	toggleSidebar: () => void;
	togglePanel: () => void;
	toggleFocusMode: () => void;
	setCommandPaletteOpen: (open: boolean) => void;
	initPreferences: () => Promise<void>;
}

export const useUIStore = create<UIStore>((set, get) => ({
	theme: "default",
	sidebarOpen: true,
	panelOpen: true,
	focusMode: false,
	commandPaletteOpen: false,
	isInitialized: false,

	setTheme: (theme) => {
		set({ theme });
		document.documentElement.setAttribute("data-theme", theme);
		savePreference("theme", theme);
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

	initPreferences: async () => {
		if (get().isInitialized) return;
		const theme = await loadPreference<ThemeType>("theme", "default");
		const sidebarOpen = await loadPreference<boolean>("sidebarOpen", true);
		const panelOpen = await loadPreference<boolean>("panelOpen", true);
		const focusMode = await loadPreference<boolean>("focusMode", false);

		// Aplica o tema no HTML
		document.documentElement.setAttribute("data-theme", theme);

		if (focusMode) {
			set({
				theme,
				sidebarOpen: false,
				panelOpen: false,
				focusMode,
				isInitialized: true,
			});
		} else {
			set({
				theme,
				sidebarOpen,
				panelOpen,
				focusMode,
				isInitialized: true,
			});
		}
	},
}));
