import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { BacklinksView } from "@/components/BacklinksView";
import { DailyEditor } from "@/components/DailyEditor";
import { createNote, resolveLinkTarget } from "@/lib/notes";
import { useNote } from "@/lib/useVault";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";

export const Route = createFileRoute("/_app/note/$id")({
	component: NoteView,
});

function NoteView() {
	const { id } = Route.useParams();
	const navigate = useNavigate();

	const panelOpen = useUIStore((state) => state.panelOpen);
	const openTab = useUIStore((state) => state.openTab);
	const notes = useVaultStore((state) => state.notes);

	const activeNote = notes.find((n) => n.id === id);

	const { data: noteText, isLoading: isNoteLoading } = useNote(id);

	// Registra/ativa a aba desta nota (label acompanha o título atual).
	useEffect(() => {
		if (activeNote) {
			openTab({
				id: `note:${id}`,
				kind: "note",
				label: activeNote.title,
				to: "/note/$id",
				params: { id },
			});
		}
	}, [id, activeNote, openTab]);

	if (!isNoteLoading && !activeNote) {
		return (
			<main className="editor items-center justify-center">
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
			</main>
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
		<>
			<main className="editor">
				{isNoteLoading ? (
					<div className="flex-1 flex flex-col items-center justify-center gap-3 h-full">
						<RefreshCw className="h-8 w-8 text-accent animate-spin" />
						<p className="text-sm text-fg-4 font-medium">Carregando nota...</p>
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
							<Link className="h-4.5 w-4.5" />
							<span className="text-[10px] font-bold uppercase tracking-wider">
								Relações da Nota
							</span>
						</div>
						<h2 className="text-sm font-bold text-fg-strong tracking-wide truncate">
							{activeNote.title}
						</h2>
					</div>

					<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
						<BacklinksView activeNote={activeNote} />
					</div>
				</aside>
			)}
		</>
	);
}
