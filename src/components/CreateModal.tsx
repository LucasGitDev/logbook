import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CircleDot, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createNote } from "@/lib/notes";
import { createTaskNode } from "@/lib/taskNode";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";

type CreateKind = "note" | "task";

/**
 * Modal de criação standalone de nota/tarefa (fora de uma daily note).
 * Reusa o visual do CommandPalette (.palette). Toggle Nota|Tarefa + título;
 * cria via createNote/createTaskNode (que reindexam e não sobrescrevem) e
 * navega pro nó criado.
 */
export function CreateModal() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const isOpen = useUIStore((state) => state.createModalOpen);
	const initialKind = useUIStore((state) => state.createModalKind);
	const setOpen = useUIStore((state) => state.setCreateModalOpen);
	const rootHandle = useVaultStore((state) => state.rootHandle);

	const [kind, setKind] = useState<CreateKind>(initialKind);
	const [title, setTitle] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const overlayRef = useRef<HTMLDivElement>(null);

	// Reseta ao abrir, sincroniza o tipo pré-selecionado e foca o input.
	useEffect(() => {
		if (isOpen) {
			setKind(initialKind);
			setTitle("");
			setSubmitting(false);
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [isOpen, initialKind]);

	if (!isOpen) return null;

	const close = () => setOpen(false);

	const submit = async () => {
		const clean = title.trim();
		if (!clean || !rootHandle || submitting) return;
		setSubmitting(true);
		try {
			if (kind === "note") {
				const { index, note } = await createNote(rootHandle, clean);
				useVaultStore.getState().setVaultData(index);
				queryClient.invalidateQueries({ queryKey: ["vaultIndex"] });
				close();
				if (note) navigate({ to: "/note/$id", params: { id: note.id } });
			} else {
				const { index, node } = await createTaskNode(rootHandle, clean);
				useVaultStore.getState().setVaultData(index);
				queryClient.invalidateQueries({ queryKey: ["vaultIndex"] });
				close();
				if (node) navigate({ to: "/task/$id", params: { id: node.id } });
			}
		} catch (err) {
			setSubmitting(false);
			alert(
				`Erro ao criar: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			e.preventDefault();
			close();
		} else if (e.key === "Enter") {
			e.preventDefault();
			submit();
		} else if (e.key === "Tab") {
			// Alterna o tipo sem sair do input.
			e.preventDefault();
			setKind((k) => (k === "note" ? "task" : "note"));
		}
	};

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === overlayRef.current) close();
	};

	const tabClass = (active: boolean) =>
		`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
			active
				? "bg-accent/15 border-accent/40 text-accent"
				: "bg-surface border-line-soft text-fg-4 hover:text-fg"
		}`;

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: overlay close backup; ESC is primary
		// biome-ignore lint/a11y/noStaticElementInteractions: modal overlay container
		<div
			className="palette-overlay"
			ref={overlayRef}
			onClick={handleOverlayClick}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard handler on container */}
			<div className="palette" onKeyDown={handleKeyDown}>
				<div className="flex gap-1.5 p-3 border-b border-line">
					<button
						type="button"
						className={tabClass(kind === "note")}
						onClick={() => setKind("note")}
					>
						<FileText className="h-3.5 w-3.5" /> Nota
					</button>
					<button
						type="button"
						className={tabClass(kind === "task")}
						onClick={() => setKind("task")}
					>
						<CircleDot className="h-3.5 w-3.5" /> Tarefa
					</button>
				</div>
				<input
					ref={inputRef}
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder={
						kind === "note" ? "Título da nota..." : "Título da tarefa..."
					}
					autoComplete="off"
				/>
				<div className="flex items-center justify-between p-3">
					<span className="text-[11px] text-fg-5 font-mono">
						{kind === "note" ? "notes/" : "tasks/"} · Tab alterna · Esc fecha
					</span>
					<button
						type="button"
						onClick={submit}
						disabled={!title.trim() || submitting}
						className="px-3 py-1.5 bg-accent hover:bg-accent-strong text-white rounded-md text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
					>
						Criar
					</button>
				</div>
			</div>
		</div>
	);
}
