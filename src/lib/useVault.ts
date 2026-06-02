import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getLocalDateString } from "@/lib/dates";
import {
	type FrontmatterFields,
	injectFrontmatterLazy,
	updateFrontmatterFields,
} from "@/lib/frontmatter";
import { dailyDateFromPath, reindexVault } from "@/lib/indexer";
import { resolveLinkTarget, sanitizeNoteName } from "@/lib/notes";
import {
	buildAgendaLine,
	setTaskScheduledDate,
	setTaskStatus,
} from "@/lib/parser";
import { buildNewTaskContent, taskFilePath } from "@/lib/taskNode";
import {
	dailyNotePath,
	ensureDailyNote,
	fileExists,
	readFile,
	writeFile,
} from "@/lib/vault";
import { useVaultStore } from "@/stores/vaultStore";
import type { AgendaItem, Task, TaskStatus } from "@/types/vault";

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

// resolveLinkTarget foi movido para ./notes (puro/testável); re-exporta p/ compat.
export { resolveLinkTarget } from "./notes";

/**
 * Tasks de um dia: agendadas (📅) ou criadas no dia, MAIS task-nós declarados
 * pelo nó daily daquele dia (via `[[link]]`) — assim declarar uma task no dia
 * a faz aparecer no painel mesmo sem data.
 */
export function useDailyTasks(date: string) {
	const tasks = useVaultStore((state) => state.tasks);
	const notes = useVaultStore((state) => state.notes);

	const daily = notes.find(
		(n) => n.type === "daily" && dailyDateFromPath(n.path) === date,
	);
	const declaredNodeIds = new Set<string>();
	if (daily) {
		for (const link of daily.links) {
			const target = resolveLinkTarget(notes, link);
			if (target?.type === "task") declaredNodeIds.add(target.id);
		}
	}

	const data = tasks.filter(
		(t) =>
			t.scheduledDate === date ||
			t.createdDate === date ||
			(t.nodeId !== undefined && declaredNodeIds.has(t.nodeId)),
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

/** Mutation para reagendar uma task (carry-over): reescreve o 📅 na origem */
export function useRescheduleTask() {
	const queryClient = useQueryClient();
	const rootHandle = useVaultStore((state) => state.rootHandle);
	const activeFilePath = useVaultStore((state) => state.activeFilePath);
	const activeEditorView = useVaultStore((state) => state.activeEditorView);

	return useMutation({
		mutationFn: async ({ task, date }: { task: Task; date: string }) => {
			if (!rootHandle) throw new Error("Vault não inicializado");

			// Fast-path: task no arquivo aberto no editor ativo → reescreve a linha.
			if (activeFilePath === task.sourceFile && activeEditorView) {
				const view = activeEditorView;
				try {
					const line = view.state.doc.line(task.sourceLine);
					const newLine = setTaskScheduledDate(line.text, date);
					view.dispatch({
						changes: { from: line.from, to: line.to, insert: newLine },
					});
					return { handledByEditor: true, sourceFile: task.sourceFile };
				} catch (e) {
					console.warn(
						"Não foi possível reagendar pelo CodeMirror, fallback p/ disco:",
						e,
					);
				}
			}

			// Fallback: reescreve a linha direto no disco.
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
			lines[task.sourceLine - 1] = setTaskScheduledDate(
				lines[task.sourceLine - 1] ?? "",
				date,
			);
			await writeFile(rootHandle, task.sourceFile, lines.join("\n"));

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

/**
 * Adiciona um compromisso (agenda) ao nó do dia: monta a linha canônica
 * (`- [ ] texto 🗓️ data ⏰ hora ...`) e a acrescenta ao fim do corpo. Se o dia
 * estiver aberto no editor ativo, escreve no disco E sincroniza o doc do
 * CodeMirror (evita conflito com o autosave). Reindexa e atualiza o painel.
 */
export function useAddAgenda() {
	const queryClient = useQueryClient();
	const rootHandle = useVaultStore((state) => state.rootHandle);
	const activeFilePath = useVaultStore((state) => state.activeFilePath);
	const activeEditorView = useVaultStore((state) => state.activeEditorView);

	return useMutation({
		mutationFn: async ({
			date,
			text,
			time,
			durationMin,
			project,
		}: {
			date: string;
			text: string;
			time: string;
			durationMin?: number;
			project?: string;
		}) => {
			if (!rootHandle) throw new Error("Vault não inicializado");

			const path = dailyNotePath(date);
			const line = buildAgendaLine({ text, date, time, durationMin, project });

			// Doc atual = editor (se este dia estiver aberto) senão disco.
			const view = activeFilePath === path ? activeEditorView : null;
			const current =
				view?.state.doc.toString() ?? (await readFile(rootHandle, path)) ?? "";
			const sep = current.length === 0 || current.endsWith("\n") ? "" : "\n";
			const insert = `${sep}${line}\n`;

			await writeFile(rootHandle, path, `${current}${insert}`);
			// Mantém o doc do editor igual ao disco — o autosave pendente vira no-op.
			if (view) {
				view.dispatch({
					changes: { from: view.state.doc.length, insert },
				});
			}

			const index = await reindexVault(rootHandle);
			return { index, date };
		},
		onSuccess: ({ index, date }) => {
			useVaultStore.getState().setVaultData(index);
			queryClient.invalidateQueries({ queryKey: ["vaultIndex"] });
			queryClient.invalidateQueries({ queryKey: ["dailyNote", date] });
			queryClient.invalidateQueries({ queryKey: ["dailyTasks", date] });
			queryClient.invalidateQueries({ queryKey: ["dailyAgenda", date] });
		},
	});
}

/**
 * Promove uma task-linha (leve) a task-nó (forte, one-way):
 * 1. cria `tasks/<título>.md` com o estado atual (status/due/projeto);
 * 2. reescreve a linha de origem no dia/nota → referência `- [[título]]`;
 * 3. reindexa. O nó passa a ser a fonte de verdade; o dia só o declara.
 */
export function usePromoteTask() {
	const queryClient = useQueryClient();
	const rootHandle = useVaultStore((state) => state.rootHandle);
	const activeFilePath = useVaultStore((state) => state.activeFilePath);
	const activeEditorView = useVaultStore((state) => state.activeEditorView);

	return useMutation({
		mutationFn: async ({ task }: { task: Task }) => {
			if (!rootHandle) throw new Error("Vault não inicializado");

			const title = sanitizeNoteName(task.text);
			if (!title) throw new Error("Task sem texto não pode ser promovida");

			// 1. Cria o nó da task (não sobrescreve se já existir).
			const taskPath = taskFilePath(title);
			if (!(await fileExists(rootHandle, taskPath))) {
				await writeFile(
					rootHandle,
					taskPath,
					buildNewTaskContent(title, {
						due: task.scheduledDate,
						project: task.project,
						status: task.status,
					}),
				);
			}

			// 2. Reescreve a linha de origem → referência `- [[título]]`.
			const toReference = (text: string): string => {
				const indent = /^(\s*)/.exec(text)?.[1] ?? "";
				return `${indent}- [[${title}]]`;
			};

			if (activeFilePath === task.sourceFile && activeEditorView) {
				const view = activeEditorView;
				const line = view.state.doc.line(task.sourceLine);
				view.dispatch({
					changes: {
						from: line.from,
						to: line.to,
						insert: toReference(line.text),
					},
				});
				// Persiste o doc do editor já sincronizado (sem clobber de edições).
				await writeFile(rootHandle, task.sourceFile, view.state.doc.toString());
			} else {
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
				lines[task.sourceLine - 1] = toReference(
					lines[task.sourceLine - 1] ?? "",
				);
				await writeFile(rootHandle, task.sourceFile, lines.join("\n"));
			}

			const index = await reindexVault(rootHandle);
			return { index, sourceFile: task.sourceFile, taskPath };
		},
		onSuccess: ({ index, sourceFile }) => {
			useVaultStore.getState().setVaultData(index);
			queryClient.invalidateQueries({ queryKey: ["vaultIndex"] });

			const date = dailyDateFromPath(sourceFile);
			if (date) {
				queryClient.invalidateQueries({ queryKey: ["dailyNote", date] });
				queryClient.invalidateQueries({ queryKey: ["dailyTasks", date] });
				queryClient.invalidateQueries({ queryKey: ["dailyAgenda", date] });
			}
		},
	});
}

/**
 * Edita propriedades do frontmatter de um nó (ex: prioridade/esforço da task).
 * Usa o builder determinístico (ordem fixa → diff limpo), preservando o corpo.
 */
export function useUpdateNodeProps() {
	const queryClient = useQueryClient();
	const rootHandle = useVaultStore((state) => state.rootHandle);

	return useMutation({
		mutationFn: async ({
			path,
			fields,
		}: {
			path: string;
			fields: Partial<FrontmatterFields>;
		}) => {
			if (!rootHandle) throw new Error("Vault não inicializado");
			const content = await readFile(rootHandle, path);
			if (content === null) throw new Error(`Arquivo não encontrado: ${path}`);
			await writeFile(
				rootHandle,
				path,
				updateFrontmatterFields(content, fields),
			);
			const index = await reindexVault(rootHandle);
			return { index, path };
		},
		onSuccess: ({ index, path }) => {
			useVaultStore.getState().setVaultData(index);
			queryClient.invalidateQueries({ queryKey: ["vaultIndex"] });
			const node = index.notes.find((n) => n.path === path);
			if (node) {
				queryClient.invalidateQueries({ queryKey: ["note", node.id] });
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
