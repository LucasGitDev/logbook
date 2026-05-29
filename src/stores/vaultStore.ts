import type { EditorView } from "@codemirror/view";
import { create } from "zustand";
import type {
	AgendaItem,
	LinkGraph,
	Note,
	Project,
	Task,
	VaultState,
} from "@/types/vault";

interface VaultStore extends VaultState {
	activeFilePath: string | null;
	activeEditorView: EditorView | null;
	activeWordCount: number;
	activeSaveStatus: "saved" | "saving" | "unsaved";
	activeCursorPos: { line: number; col: number };
	gitBranch: string | null;
	setGitBranch: (branch: string | null) => void;
	setRootHandle: (handle: FileSystemDirectoryHandle | null) => void;
	setActiveEditor: (view: EditorView | null, filePath: string | null) => void;
	setActiveWordCount: (count: number) => void;
	setActiveSaveStatus: (status: "saved" | "saving" | "unsaved") => void;
	setActiveCursorPos: (pos: { line: number; col: number }) => void;
	setVaultData: (data: {
		tasks: Task[];
		agendaItems: AgendaItem[];
		projects: Project[];
		notes: Note[];
		links: LinkGraph;
	}) => void;
	reset: () => void;
}

const initialState: VaultState = {
	rootHandle: null,
	tasks: [],
	agendaItems: [],
	projects: [],
	notes: [],
	links: {},
	isLoaded: false,
};

export const useVaultStore = create<VaultStore>((set) => ({
	...initialState,
	activeFilePath: null,
	activeEditorView: null,
	activeWordCount: 0,
	activeSaveStatus: "saved",
	activeCursorPos: { line: 1, col: 1 },
	gitBranch: null,
	setGitBranch: (gitBranch) => set({ gitBranch }),
	setRootHandle: (rootHandle) =>
		set({ rootHandle, isLoaded: rootHandle !== null }),
	setActiveEditor: (view, filePath) =>
		set({ activeEditorView: view, activeFilePath: filePath }),
	setActiveWordCount: (activeWordCount) => set({ activeWordCount }),
	setActiveSaveStatus: (activeSaveStatus) => set({ activeSaveStatus }),
	setActiveCursorPos: (activeCursorPos) => set({ activeCursorPos }),
	setVaultData: (data) =>
		set({
			tasks: data.tasks,
			agendaItems: data.agendaItems,
			projects: data.projects,
			notes: data.notes,
			links: data.links,
		}),
	reset: () =>
		set({
			...initialState,
			activeFilePath: null,
			activeEditorView: null,
			activeWordCount: 0,
			activeSaveStatus: "saved",
			activeCursorPos: { line: 1, col: 1 },
			gitBranch: null,
		}),
}));
