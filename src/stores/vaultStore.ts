import type { EditorView } from "@codemirror/view";
import { create } from "zustand";
import type {
	AgendaItem,
	Note,
	Project,
	Task,
	VaultState,
} from "@/types/vault";

interface VaultStore extends VaultState {
	activeFilePath: string | null;
	activeEditorView: EditorView | null;
	setRootHandle: (handle: FileSystemDirectoryHandle | null) => void;
	setActiveEditor: (view: EditorView | null, filePath: string | null) => void;
	setVaultData: (data: {
		tasks: Task[];
		agendaItems: AgendaItem[];
		projects: Project[];
		notes: Note[];
	}) => void;
	reset: () => void;
}

const initialState: VaultState = {
	rootHandle: null,
	tasks: [],
	agendaItems: [],
	projects: [],
	notes: [],
	isLoaded: false,
};

export const useVaultStore = create<VaultStore>((set) => ({
	...initialState,
	activeFilePath: null,
	activeEditorView: null,
	setRootHandle: (rootHandle) =>
		set({ rootHandle, isLoaded: rootHandle !== null }),
	setActiveEditor: (view, filePath) =>
		set({ activeEditorView: view, activeFilePath: filePath }),
	setVaultData: (data) =>
		set({
			tasks: data.tasks,
			agendaItems: data.agendaItems,
			projects: data.projects,
			notes: data.notes,
		}),
	reset: () =>
		set({ ...initialState, activeFilePath: null, activeEditorView: null }),
}));
