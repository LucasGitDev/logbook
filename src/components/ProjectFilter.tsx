import { Hash, X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";

/** Chips de projeto (#tag) derivados do índice. Clicar alterna o filtro ativo. */
export function ProjectFilter() {
	const projects = useVaultStore((state) => state.projects);
	const activeProject = useUIStore((state) => state.activeProject);
	const setActiveProject = useUIStore((state) => state.setActiveProject);

	if (projects.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="text-[10px] font-bold text-fg-5 uppercase tracking-widest font-mono mr-1">
				Projetos
			</span>
			{projects.map((p) => {
				const isActive = activeProject === p.tag;
				return (
					<button
						key={p.tag}
						type="button"
						onClick={() => setActiveProject(isActive ? null : p.tag)}
						className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors cursor-pointer font-mono ${
							isActive
								? "bg-pink/15 border-pink/40 text-pink"
								: "bg-surface border-line-soft text-fg-4 hover:text-fg-2 hover:border-line"
						}`}
					>
						<Hash className="h-2.5 w-2.5" />
						{p.tag}
					</button>
				);
			})}
			{activeProject && (
				<button
					type="button"
					onClick={() => setActiveProject(null)}
					className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full text-fg-5 hover:text-danger transition-colors cursor-pointer font-mono"
					title="Limpar filtro"
				>
					<X className="h-3 w-3" />
					Limpar
				</button>
			)}
		</div>
	);
}
