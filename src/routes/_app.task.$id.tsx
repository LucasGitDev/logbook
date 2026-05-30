import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleDot, Flag, Hourglass, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { BacklinksView } from "@/components/BacklinksView";
import { DailyEditor } from "@/components/DailyEditor";
import { createNote, resolveLinkTarget } from "@/lib/notes";
import { useNote, useToggleTask, useUpdateNodeProps } from "@/lib/useVault";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";
import type { Priority, TaskStatus } from "@/types/vault";

export const Route = createFileRoute("/_app/task/$id")({
	component: TaskView,
});

const STATUSES: { value: TaskStatus; label: string }[] = [
	{ value: "open", label: "Aberta" },
	{ value: "doing", label: "Em curso" },
	{ value: "done", label: "Feita" },
	{ value: "cancelled", label: "Cancelada" },
];

const PRIORITIES: { value: Priority | ""; label: string }[] = [
	{ value: "", label: "—" },
	{ value: "high", label: "Alta" },
	{ value: "medium", label: "Média" },
	{ value: "low", label: "Baixa" },
];

function TaskView() {
	const { id } = Route.useParams();
	const navigate = useNavigate();

	const panelOpen = useUIStore((state) => state.panelOpen);
	const openTab = useUIStore((state) => state.openTab);
	const notes = useVaultStore((state) => state.notes);
	const tasks = useVaultStore((state) => state.tasks);

	const activeNote = notes.find((n) => n.id === id);
	const canonical = tasks.find((t) => t.nodeId === id);

	const { data: noteText, isLoading } = useNote(id);
	const toggleMutation = useToggleTask();
	const propsMutation = useUpdateNodeProps();

	useEffect(() => {
		if (activeNote) {
			openTab({
				id: `task:${id}`,
				kind: "task",
				label: activeNote.title,
				to: "/task/$id",
				params: { id },
			});
		}
	}, [id, activeNote, openTab]);

	if (!isLoading && !activeNote) {
		return (
			<main className="editor items-center justify-center">
				<p className="text-sm font-mono text-danger mb-4">
					Tarefa não encontrada no Vault.
				</p>
				<button
					type="button"
					onClick={() => navigate({ to: "/" })}
					className="px-4 py-2 bg-accent hover:bg-accent-strong text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
				>
					Voltar ao início
				</button>
			</main>
		);
	}

	const handleLinkClick = (name: string) => {
		const isDate = /^\d{4}-\d{2}-\d{2}$/.test(name);
		if (isDate) {
			navigate({ to: "/daily/$date", params: { date: name } });
			return;
		}
		const store = useVaultStore.getState();
		const target = resolveLinkTarget(store.notes, name);
		if (target?.type === "task") {
			navigate({ to: "/task/$id", params: { id: target.id } });
		} else if (target) {
			navigate({ to: "/note/$id", params: { id: target.id } });
		} else {
			const create = confirm(
				`A nota "${name}" não existe. Deseja criá-la agora?`,
			);
			if (create && store.rootHandle) {
				createNote(store.rootHandle, name)
					.then(({ index, note }) => {
						useVaultStore.getState().setVaultData(index);
						if (note) navigate({ to: "/note/$id", params: { id: note.id } });
					})
					.catch((err) => {
						alert(
							`Erro ao criar nota: ${err instanceof Error ? err.message : String(err)}`,
						);
					});
			}
		}
	};

	const setStatus = (status: TaskStatus) => {
		if (canonical)
			toggleMutation.mutate({ task: canonical, newStatus: status });
	};
	const setPriority = (priority: Priority | "") => {
		if (activeNote)
			propsMutation.mutate({
				path: activeNote.path,
				fields: { priority: priority || undefined },
			});
	};
	const setEffort = (effort: string) => {
		if (activeNote)
			propsMutation.mutate({
				path: activeNote.path,
				fields: { effort: effort.trim() || undefined },
			});
	};

	return (
		<>
			<main className="editor">
				{isLoading ? (
					<div className="flex-1 flex flex-col items-center justify-center gap-3 h-full">
						<RefreshCw className="h-8 w-8 text-accent animate-spin" />
						<p className="text-sm text-fg-4 font-medium">
							Carregando tarefa...
						</p>
					</div>
				) : (
					<DailyEditor
						initialValue={noteText ?? ""}
						filePath={activeNote?.path ?? ""}
						onLinkClick={handleLinkClick}
					/>
				)}
			</main>

			{panelOpen && activeNote && (
				<aside className="panel">
					<div className="p-4 border-b border-line-soft bg-footer">
						<div className="flex items-center gap-2 text-accent-soft mb-1.5 font-mono">
							<CircleDot className="h-4.5 w-4.5" />
							<span className="text-[10px] font-bold uppercase tracking-wider">
								Tarefa
							</span>
						</div>
						<h2 className="text-sm font-bold text-fg-strong tracking-wide truncate">
							{activeNote.title}
						</h2>
					</div>

					<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
						{/* Status (4) */}
						<div className="flex flex-col gap-2">
							<span className="text-[10px] font-bold uppercase tracking-wider text-fg-4 font-mono">
								Status
							</span>
							<div className="flex flex-wrap gap-1.5">
								{STATUSES.map((s) => (
									<button
										key={s.value}
										type="button"
										onClick={() => setStatus(s.value)}
										className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
											canonical?.status === s.value
												? "bg-accent/15 border-accent/40 text-accent"
												: "bg-surface border-line-soft text-fg-4 hover:text-fg"
										}`}
									>
										{s.label}
									</button>
								))}
							</div>
						</div>

						{/* Prioridade */}
						<div className="flex flex-col gap-2">
							<span className="text-[10px] font-bold uppercase tracking-wider text-fg-4 font-mono flex items-center gap-1">
								<Flag className="h-3 w-3" /> Prioridade
							</span>
							<div className="flex flex-wrap gap-1.5">
								{PRIORITIES.map((p) => (
									<button
										key={p.value || "none"}
										type="button"
										onClick={() => setPriority(p.value)}
										className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
											(canonical?.priority ?? "") === p.value
												? "bg-pink/15 border-pink/40 text-pink"
												: "bg-surface border-line-soft text-fg-4 hover:text-fg"
										}`}
									>
										{p.label}
									</button>
								))}
							</div>
						</div>

						{/* Esforço */}
						<div className="flex flex-col gap-2">
							<label
								htmlFor="task-effort"
								className="text-[10px] font-bold uppercase tracking-wider text-fg-4 font-mono flex items-center gap-1"
							>
								<Hourglass className="h-3 w-3" /> Esforço
							</label>
							<input
								id="task-effort"
								type="text"
								defaultValue={canonical?.effort ?? ""}
								placeholder="ex: 2h, 30m"
								onBlur={(e) => setEffort(e.target.value)}
								className="text-xs px-2.5 py-1.5 rounded-md bg-surface border border-line-soft text-fg focus:outline-none focus:border-accent/40 font-mono"
							/>
						</div>

						<hr className="border-line-soft" />

						<BacklinksView activeNote={activeNote} />
					</div>
				</aside>
			)}
		</>
	);
}
