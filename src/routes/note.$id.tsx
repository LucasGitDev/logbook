import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { BacklinksView } from "@/components/BacklinksView";
import { CommandPalette } from "@/components/CommandPalette";
import { DailyEditor } from "@/components/DailyEditor";
import { Sidebar } from "@/components/Sidebar";
import { Statusbar } from "@/components/Statusbar";
import { Topbar } from "@/components/Topbar";
import { createNote, resolveLinkTarget } from "@/lib/notes";
import { useNote, useVaultIndex } from "@/lib/useVault";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";

export const Route = createFileRoute("/note/$id")({
	component: NoteView,
});

function NoteView() {
	const { id } = Route.useParams();
	const navigate = useNavigate();

	const isLoaded = useVaultStore((state) => state.isLoaded);
	const sidebarOpen = useUIStore((state) => state.sidebarOpen);
	const panelOpen = useUIStore((state) => state.panelOpen);
	const notes = useVaultStore((state) => state.notes);

	// Sempre ativa o re-indexador automático quando o vault está carregado
	const { isLoading: isIndexing } = useVaultIndex();

	// Redireciona para o início se o vault não estiver aberto
	useEffect(() => {
		if (!isLoaded) {
			navigate({ to: "/" });
		}
	}, [isLoaded, navigate]);

	// Encontra a nota ativa no store pelo ID
	const activeNote = notes.find((n) => n.id === id);

	// Carrega o conteúdo do arquivo da nota
	const { data: noteText, isLoading: isNoteLoading } = useNote(id);

	if (!isLoaded) {
		return null;
	}

	const isLoadingData = isNoteLoading || isIndexing;

	if (isLoaded && !isNoteLoading && !activeNote) {
		return (
			<div className="flex flex-col h-screen w-screen items-center justify-center bg-bg text-fg">
				<p className="text-sm font-mono text-danger mb-4">
					Nota não encontrada no Vault.
				</p>
				<button
					type="button"
					onClick={() => navigate({ to: "/" })}
					className="px-4 py-2 bg-accent hover:bg-accent-strong text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
				>
					Voltar ao início
				</button>
			</div>
		);
	}

	const handleLinkClick = (noteName: string) => {
		const isDate = /^\d{4}-\d{2}-\d{2}$/.test(noteName);
		if (isDate) {
			navigate({ to: "/daily/$date", params: { date: noteName } });
			return;
		}

		const store = useVaultStore.getState();
		const targetNote = resolveLinkTarget(store.notes, noteName);
		if (targetNote) {
			navigate({ to: "/note/$id", params: { id: targetNote.id } });
		} else {
			const create = confirm(
				`A nota "${noteName}" não existe. Deseja criá-la agora?`,
			);
			if (create && store.rootHandle) {
				createNote(store.rootHandle, noteName)
					.then(({ index, note }) => {
						useVaultStore.getState().setVaultData(index);
						if (note) {
							navigate({ to: "/note/$id", params: { id: note.id } });
						}
					})
					.catch((err) => {
						alert(
							`Erro ao criar nota: ${err instanceof Error ? err.message : String(err)}`,
						);
					});
			}
		}
	};

	return (
		<div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-fg">
			{/* Topbar global */}
			<Topbar />

			<div className="flex-1 flex min-h-0">
				{/* Sidebar de navegação */}
				{sidebarOpen && <Sidebar activeNoteId={id} />}

				{/* Conteúdo Central: Editor */}
				<main className="editor">
					{isLoadingData ? (
						<div className="flex-1 flex flex-col items-center justify-center gap-3 h-full">
							<RefreshCw className="h-8 w-8 text-accent animate-spin" />
							<p className="text-sm text-fg-4 font-medium">
								Carregando nota...
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

				{/* Painel Lateral Direito: Backlinks */}
				{panelOpen && activeNote && (
					<aside className="panel">
						{/* Cabeçalho do Painel */}
						<div className="p-4 border-b border-line-soft bg-footer">
							<div className="flex items-center gap-2 text-accent-soft mb-1.5 font-mono">
								<Link className="h-4.5 w-4.5" />
								<span className="text-[10px] font-bold uppercase tracking-wider">
									Relações da Nota
								</span>
							</div>
							<h2 className="text-sm font-bold text-fg-strong tracking-wide truncate">
								{activeNote.title}
							</h2>
							{isIndexing && (
								<span className="text-[9px] text-fg-5 mt-1 inline-block font-mono">
									Atualizando índices do vault...
								</span>
							)}
						</div>

						{/* Listas Roláveis */}
						<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
							<BacklinksView activeNote={activeNote} />
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
