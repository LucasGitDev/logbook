import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Calendar, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { AgendaView } from "@/components/AgendaView";
import { CommandPalette } from "@/components/CommandPalette";
import { DailyEditor } from "@/components/DailyEditor";
import { Sidebar } from "@/components/Sidebar";
import { Statusbar } from "@/components/Statusbar";
import { TaskList } from "@/components/TaskList";
import { Topbar } from "@/components/Topbar";
import { createNote, resolveLinkTarget } from "@/lib/notes";
import {
	useDailyAgenda,
	useDailyNote,
	useDailyTasks,
	useVaultIndex,
} from "@/lib/useVault";
import { dailyNotePath } from "@/lib/vault";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";

export const Route = createFileRoute("/daily/$date")({
	component: DailyView,
});

function DailyView() {
	const { date } = Route.useParams();
	const navigate = useNavigate();

	const isLoaded = useVaultStore((state) => state.isLoaded);
	const notes = useVaultStore((state) => state.notes);
	const rootHandle = useVaultStore((state) => state.rootHandle);
	const sidebarOpen = useUIStore((state) => state.sidebarOpen);
	const panelOpen = useUIStore((state) => state.panelOpen);

	// Sempre ativa o re-indexador automático quando o vault está carregado
	const { isLoading: isIndexing } = useVaultIndex();

	// Redireciona para o início se o vault não estiver aberto
	useEffect(() => {
		if (!isLoaded) {
			navigate({ to: "/" });
		}
	}, [isLoaded, navigate]);

	// Carrega os dados do dia
	const { data: noteText, isLoading: isNoteLoading } = useDailyNote(date);
	const { data: tasks = [], isLoading: isTasksLoading } = useDailyTasks(date);
	const { data: agenda = [], isLoading: isAgendaLoading } =
		useDailyAgenda(date);

	if (!isLoaded) {
		return null;
	}

	const formatHeaderDate = (dateStr: string) => {
		const d = new Date(`${dateStr}T12:00:00`);
		const formatted = d.toLocaleDateString("pt-BR", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		});
		return formatted.charAt(0).toUpperCase() + formatted.slice(1);
	};

	const isLoadingData =
		isNoteLoading || isTasksLoading || isAgendaLoading || isIndexing;

	return (
		<div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-fg">
			{/* Topbar global */}
			<Topbar />

			<div className="flex-1 flex min-h-0">
				{/* Sidebar de navegação */}
				{sidebarOpen && <Sidebar selectedDate={date} />}

				{/* Conteúdo Central: Editor */}
				<main className="editor">
					{isLoadingData ? (
						<div className="flex-1 flex flex-col items-center justify-center gap-3 h-full">
							<RefreshCw className="h-8 w-8 text-accent animate-spin" />
							<p className="text-sm text-fg-4 font-medium">
								Carregando dados do dia...
							</p>
						</div>
					) : (
						<DailyEditor
							initialValue={noteText ?? ""}
							filePath={dailyNotePath(date)}
							onLinkClick={(noteName) => {
								const isDate = /^\d{4}-\d{2}-\d{2}$/.test(noteName);
								if (isDate) {
									navigate({ to: "/daily/$date", params: { date: noteName } });
									return;
								}

								const targetNote = resolveLinkTarget(notes, noteName);
								if (targetNote) {
									navigate({ to: "/note/$id", params: { id: targetNote.id } });
								} else {
									const create = confirm(
										`A nota "${noteName}" não existe. Deseja criá-la agora?`,
									);
									if (create && rootHandle) {
										createNote(rootHandle, noteName)
											.then(({ index, note }) => {
												useVaultStore.getState().setVaultData(index);
												if (note) {
													navigate({
														to: "/note/$id",
														params: { id: note.id },
													});
												}
											})
											.catch((err) => {
												alert(
													`Erro ao criar nota: ${err instanceof Error ? err.message : String(err)}`,
												);
											});
									}
								}
							}}
						/>
					)}
				</main>

				{/* Painel Lateral Direito: Tarefas e Compromissos */}
				{panelOpen && (
					<aside className="panel">
						{/* Cabeçalho do Painel */}
						<div className="p-4 border-b border-line-soft bg-footer">
							<div className="flex items-center gap-2 text-accent-soft mb-1.5 font-mono">
								<Calendar className="h-4.5 w-4.5" />
								<span className="text-[10px] font-bold uppercase tracking-wider">
									Painel Diário
								</span>
							</div>
							<h2 className="text-sm font-bold text-fg-strong tracking-wide truncate">
								{formatHeaderDate(date)}
							</h2>
							{isIndexing && (
								<span className="text-[9px] text-fg-5 mt-1 inline-block font-mono">
									Atualizando índices do vault...
								</span>
							)}
						</div>

						{/* Listas Roláveis */}
						<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
							<AgendaView items={agenda} />

							<hr className="border-line-soft" />

							<TaskList tasks={tasks} date={date} />
						</div>
					</aside>
				)}
			</div>

			{/* Statusbar global */}
			<Statusbar />

			{/* Command Palette */}
			<CommandPalette />
		</div>
	);
}
