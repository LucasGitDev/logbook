import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getLocalDateString } from "@/lib/dates";
import { injectFrontmatterLazy } from "@/lib/frontmatter";
import { dailyDateFromPath, reindexVault } from "@/lib/indexer";
import { setTaskStatus } from "@/lib/parser";
import {
	dailyNotePath,
	ensureDailyNote,
	readFile,
	writeFile,
} from "@/lib/vault";
import { useVaultStore } from "@/stores/vaultStore";
import type { AgendaItem, Note, Task, TaskStatus } from "@/types/vault";

/** Hook para recarregar o índice do vault quando o rootHandle mudar */
export function useVaultIndex() {
	const rootHandle = useVaultStore((state) => state.rootHandle);

	const query = useQuery({
		queryKey: ["vaultIndex", rootHandle],
		queryFn: async () => {
			if (!rootHandle) return null;
			return reindexVault(rootHandle);
		},
		enabled: !!rootHandle,
		staleTime: Number.POSITIVE_INFINITY,
	});

	useEffect(() => {
		if (query.data) {
			useVaultStore.getState().setVaultData(query.data);
		}
	}, [query.data]);

	return query;
}

/** Hook para carregar a nota de um dia específico (bruta) */
export function useDailyNote(date: string) {
	const rootHandle = useVaultStore((state) => state.rootHandle);

	return useQuery({
		queryKey: ["dailyNote", date, rootHandle],
		queryFn: async () => {
			if (!rootHandle) throw new Error("Vault não inicializado");
			await ensureDailyNote(rootHandle, date);
			const path = dailyNotePath(date);
			const content = await readFile(rootHandle, path);
			return content ?? "";
		},
		enabled: !!rootHandle && !!date,
	});
}

/** Hook para carregar uma nota livre pelo seu ID (bruta) */
export function useNote(id: string) {
	const rootHandle = useVaultStore((state) => state.rootHandle);
	const notes = useVaultStore((state) => state.notes);
	const isLoaded = useVaultStore((state) => state.isLoaded);

	const note = notes.find((n) => n.id === id);
	const path = note?.path;

	return useQuery({
		queryKey: ["note", id, path, rootHandle],
		queryFn: async () => {
			if (!rootHandle) throw new Error("Vault não inicializado");
			if (!path) throw new Error(`Nota com ID ${id} não encontrada`);
			const content = await readFile(rootHandle, path);
			return content ?? "";
		},
		enabled: !!rootHandle && isLoaded && !!path,
	});
}

/** Resolve um nome de wikilink (título ou alias) para um nó do vault de forma case-insensitive */
export function resolveLinkTarget(
	notes: Note[],
	targetName: string,
): Note | null {
	const lower = targetName.trim().toLowerCase();
	return (
		notes.find((n) => {
			if (n.title.toLowerCase() === lower) return true;
			if (n.aliases.some((alias) => alias.toLowerCase() === lower)) return true;
			return false;
		}) ?? null
	);
}

/** Hook para carregar as tasks de um dia específico (lendo reativamente do store Zustand) */
export function useDailyTasks(date: string) {
	const tasks = useVaultStore((state) => state.tasks);
	const data = tasks.filter(
		(t) => t.scheduledDate === date || t.createdDate === date,
	);
	return { data, isLoading: false };
}

/** Hook para carregar os compromissos da agenda de um dia específico (lendo reativamente do store Zustand) */
export function useDailyAgenda(date: string) {
	const agendaItems = useVaultStore((state) => state.agendaItems);
	const data = [...agendaItems]
		.filter((a) => a.date === date)
		.sort((a, b) => a.time.localeCompare(b.time));
	return { data, isLoading: false };
}

/** Mutation para salvar uma nota (e atualizar os índices) */
export function useSaveNote() {
	const queryClient = useQueryClient();
	const rootHandle = useVaultStore((state) => state.rootHandle);

	return useMutation({
		mutationFn: async ({
			path,
			content,
		}: {
			path: string;
			content: string;
		}) => {
			if (!rootHandle) throw new Error("Vault não inicializado");

			// Injeta o frontmatter se ausente (lazy)
			let contentWithFrontmatter = content;
			const date = dailyDateFromPath(path);
			if (date) {
				contentWithFrontmatter = injectFrontmatterLazy(content, {
					title: date,
					type: "daily",
					created: date,
				});
			} else if (path.startsWith("notes/")) {
				const name = path.slice(6).replace(/\.md$/, "");
				const todayStr = getLocalDateString();
				contentWithFrontmatter = injectFrontmatterLazy(content, {
					title: name,
					type: "note",
					created: todayStr,
				});
			}

			await writeFile(rootHandle, path, contentWithFrontmatter);
			const index = await reindexVault(rootHandle);
			return { path, index };
		},
		onSuccess: ({ path, index }) => {
			useVaultStore.getState().setVaultData(index);
			queryClient.invalidateQueries({ queryKey: ["vaultIndex"] });

			const date = dailyDateFromPath(path);
			if (date) {
				queryClient.invalidateQueries({ queryKey: ["dailyNote", date] });
				queryClient.invalidateQueries({ queryKey: ["dailyTasks", date] });
				queryClient.invalidateQueries({ queryKey: ["dailyAgenda", date] });
			} else {
				const note = index.notes.find((n) => n.path === path);
				if (note) {
					queryClient.invalidateQueries({ queryKey: ["note", note.id] });
				}
			}
		},
	});
}

/** Mutation inteligente para marcar task/agenda como feita/aberta */
export function useToggleTask() {
	const queryClient = useQueryClient();
	const rootHandle = useVaultStore((state) => state.rootHandle);
	const activeFilePath = useVaultStore((state) => state.activeFilePath);
	const activeEditorView = useVaultStore((state) => state.activeEditorView);

	return useMutation({
		mutationFn: async ({
			task,
			newStatus,
		}: {
			task: Task | AgendaItem;
			newStatus: TaskStatus;
		}) => {
			if (!rootHandle) throw new Error("Vault não inicializado");

			// Se a tarefa está no arquivo que está aberto no editor ativo, atualiza direto no CodeMirror!
			if (activeFilePath === task.sourceFile && activeEditorView) {
				const view = activeEditorView;
				try {
					const line = view.state.doc.line(task.sourceLine);
					const newLine = setTaskStatus(line.text, newStatus);
					view.dispatch({
						changes: { from: line.from, to: line.to, insert: newLine },
					});
					return { handledByEditor: true, sourceFile: task.sourceFile };
				} catch (e) {
					console.warn(
						"Não foi possível atualizar pelo CodeMirror, fazendo fallback p/ escrita no disco:",
						e,
					);
				}
			}

			// Caso contrário, atualiza no disco diretamente
			const content = await readFile(rootHandle, task.sourceFile);
			if (content === null) {
				throw new Error(`Arquivo não encontrado: ${task.sourceFile}`);
			}

			const lines = content.split(/\r?\n/);
			if (task.sourceLine <= 0 || task.sourceLine > lines.length) {
				throw new Error(
					`Linha inválida ${task.sourceLine} no arquivo ${task.sourceFile}`,
				);
			}

			lines[task.sourceLine - 1] = setTaskStatus(
				lines[task.sourceLine - 1] ?? "",
				newStatus,
			);
			const updatedContent = lines.join("\n");
			await writeFile(rootHandle, task.sourceFile, updatedContent);

			// Re-indexa o vault
			const index = await reindexVault(rootHandle);
			return { handledByEditor: false, sourceFile: task.sourceFile, index };
		},
		onSuccess: (result) => {
			if (!result.handledByEditor && result.index) {
				useVaultStore.getState().setVaultData(result.index);
				queryClient.invalidateQueries({ queryKey: ["vaultIndex"] });
			}

			const date = dailyDateFromPath(result.sourceFile);
			if (date) {
				queryClient.invalidateQueries({ queryKey: ["dailyNote", date] });
				queryClient.invalidateQueries({ queryKey: ["dailyTasks", date] });
				queryClient.invalidateQueries({ queryKey: ["dailyAgenda", date] });
			}
		},
	});
}
