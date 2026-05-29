import { Link } from "@tanstack/react-router";
import { Calendar, FileText, Link2 } from "lucide-react";
import { dailyDateFromPath } from "@/lib/indexer";
import { useVaultStore } from "@/stores/vaultStore";
import type { Note } from "@/types/vault";

interface BacklinksViewProps {
	activeNote: Note;
}

export function BacklinksView({ activeNote }: BacklinksViewProps) {
	const linkGraph = useVaultStore((state) => state.links);
	const notes = useVaultStore((state) => state.notes);

	// Coleta os alvos de link associados a esta nota (título e aliases)
	const targets = [
		activeNote.title.toLowerCase(),
		...activeNote.aliases.map((a) => a.toLowerCase()),
	];

	// Encontra os caminhos dos arquivos que apontam para esta nota
	const sourcePaths = new Set<string>();
	for (const [key, paths] of Object.entries(linkGraph)) {
		if (targets.includes(key.toLowerCase())) {
			for (const path of paths) {
				sourcePaths.add(path);
			}
		}
	}

	// Filtra a lista de notas com os caminhos encontrados
	const backlinks = notes.filter((n) => sourcePaths.has(n.path));

	return (
		<div className="flex flex-col gap-4">
			<h3 className="text-xs font-semibold text-fg-4 uppercase tracking-wider mb-1 flex items-center justify-between font-mono">
				<span>Backlinks</span>
				<span className="bg-accent/10 text-accent-soft text-[10px] px-1.5 py-0.5 rounded-full font-bold">
					{backlinks.length}
				</span>
			</h3>

			{backlinks.length === 0 ? (
				<p className="text-xs text-fg-5 italic p-3 text-center bg-surface border border-dashed border-line-soft rounded-lg font-mono">
					Nenhuma nota aponta para esta nota
				</p>
			) : (
				<div className="flex flex-col gap-2">
					{backlinks.map((note) => {
						const isDaily = note.type === "daily";
						const dailyDate = isDaily ? dailyDateFromPath(note.path) : null;
						return (
							<Link
								key={note.id}
								to={isDaily ? "/daily/$date" : "/note/$id"}
								params={isDaily ? { date: dailyDate ?? "" } : { id: note.id }}
								className="flex items-center gap-2.5 p-3 rounded-lg border border-line-soft bg-surface hover:bg-surface-hover hover:border-line transition-all duration-120 group text-sm text-fg-2 hover:text-fg font-medium cursor-pointer"
							>
								{isDaily ? (
									<Calendar className="h-4.5 w-4.5 text-accent-soft flex-shrink-0" />
								) : (
									<FileText className="h-4.5 w-4.5 text-fg-5 group-hover:text-accent-soft flex-shrink-0" />
								)}
								<span className="truncate flex-1">
									{isDaily && dailyDate ? dailyDate : note.title}
								</span>
								<Link2 className="h-3.5 w-3.5 text-fg-5 opacity-0 group-hover:opacity-100 transition-opacity" />
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}
