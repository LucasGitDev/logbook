import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Calendar, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { AgendaView } from "@/components/AgendaView";
import { DailyEditor } from "@/components/DailyEditor";
import { Sidebar } from "@/components/Sidebar";
import { TaskList } from "@/components/TaskList";
import {
	useDailyAgenda,
	useDailyNote,
	useDailyTasks,
	useVaultIndex,
} from "@/lib/useVault";
import { dailyNotePath } from "@/lib/vault";
import { useVaultStore } from "@/stores/vaultStore";

export const Route = createFileRoute("/daily/$date")({
	component: DailyView,
});

function DailyView() {
	const { date } = Route.useParams();
	const navigate = useNavigate();

	const isLoaded = useVaultStore((state) => state.isLoaded);

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
		<div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0c] text-gray-200">
			{/* Sidebar de navegação */}
			<Sidebar selectedDate={date} />

			{/* Conteúdo Central: Editor */}
			<main className="flex-1 flex flex-col h-full bg-[#0d0d11]">
				{isLoadingData ? (
					<div className="flex-1 flex flex-col items-center justify-center gap-3">
						<RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
						<p className="text-sm text-gray-400 font-medium">
							Carregando dados do dia...
						</p>
					</div>
				) : (
					<DailyEditor
						initialValue={noteText ?? ""}
						filePath={dailyNotePath(date)}
						onLinkClick={(noteName) => {
							// Navegação de wikilinks (se for data vai pra daily, senão vai p/ note na fase 3)
							const isDate = /^\d{4}-\d{2}-\d{2}$/.test(noteName);
							if (isDate) {
								navigate({ to: "/daily/$date", params: { date: noteName } });
							} else {
								console.log("Wikilink clicado:", noteName);
							}
						}}
					/>
				)}
			</main>

			{/* Painel Lateral Direito: Tarefas e Compromissos */}
			<aside className="w-96 border-l border-[rgba(255,255,255,0.06)] bg-[rgba(10,10,12,0.4)] backdrop-blur-xl h-full flex flex-col overflow-hidden">
				{/* Cabeçalho do Painel */}
				<div className="p-6 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,22,0.2)]">
					<div className="flex items-center gap-2 text-indigo-400 mb-1.5">
						<Calendar className="h-4.5 w-4.5" />
						<span className="text-[10px] font-bold uppercase tracking-wider">
							Painel Diário
						</span>
					</div>
					<h2 className="text-base font-bold text-white tracking-wide truncate">
						{formatHeaderDate(date)}
					</h2>
					{isIndexing && (
						<span className="text-[9px] text-gray-500 animate-pulse mt-1 inline-block">
							Atualizando índices do vault...
						</span>
					)}
				</div>

				{/* Listas Roláveis */}
				<div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
					<AgendaView items={agenda} />

					<hr className="border-[rgba(255,255,255,0.04)]" />

					<TaskList tasks={tasks} date={date} />
				</div>
			</aside>
		</div>
	);
}
