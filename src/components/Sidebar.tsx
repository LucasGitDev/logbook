import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
	Calendar,
	ChevronRight,
	Compass,
	FileText,
	FolderCheck,
	Inbox,
	LayoutGrid,
	LogOut,
} from "lucide-react";
import { useState } from "react";
import { getLocalDateString } from "@/lib/dates";
import { clearVaultHandle } from "@/lib/idb";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";

export function Sidebar() {
	const navigate = useNavigate();
	const rootHandle = useVaultStore((state) => state.rootHandle);
	const resetVault = useVaultStore((state) => state.reset);
	const clearTabs = useUIStore((state) => state.clearTabs);
	const [customDate, setCustomDate] = useState("");

	// Estado ativo derivado da rota atual (sidebar é compartilhada na casca).
	const pathname = useRouterState({
		select: (s) => s.location.pathname,
	});
	const selectedDate = pathname.match(/^\/daily\/(.+)$/)?.[1];
	const activeNoteId = pathname.match(/^\/note\/(.+)$/)?.[1];
	const isInboxActive = pathname === "/inbox";
	const isWeekActive = pathname === "/week";

	const today = new Date();
	const todayStr = getLocalDateString();

	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	const yesterdayStr = getLocalDateString(yesterday);

	// Gera os últimos 7 dias
	const recentDays: string[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date();
		d.setDate(today.getDate() - i);
		recentDays.push(getLocalDateString(d));
	}

	// Recupera todas as notas diárias existentes no vault a partir do store
	const notes = useVaultStore((state) => state.notes);
	const freeNotes = notes
		.filter((n) => n.type === "note")
		.sort((a, b) => a.title.localeCompare(b.title));
	const dailyDates = notes
		.filter((n) => n.type === "daily")
		.map((n) => {
			const parts = n.path.split("/");
			return parts[1] ?? "";
		})
		.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

	// Une os últimos 7 dias do calendário com os dias existentes no vault, dedupa e ordena (mais recentes primeiro)
	const allDaysSet = new Set([...recentDays, ...dailyDates]);
	const sortedDays = Array.from(allDaysSet).sort((a, b) => b.localeCompare(a));

	const formatDateLabel = (dateStr: string) => {
		if (dateStr === todayStr) return "Hoje";
		if (dateStr === yesterdayStr) return "Ontem";

		const d = new Date(`${dateStr}T12:00:00`); // Evita problemas de fuso horário
		const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
		const dayMonth = d.toLocaleDateString("pt-BR", {
			day: "numeric",
			month: "short",
		});
		const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

		return `${capitalize(weekday.split("-")[0] ?? weekday)}, ${dayMonth}`;
	};

	const handleCloseVault = () => {
		// Limpa o handle persistido no IndexedDB e reseta o estado da store
		clearVaultHandle();
		resetVault();
		clearTabs();
		navigate({ to: "/" });
	};

	const handleCustomDateSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (customDate) {
			navigate({ to: "/daily/$date", params: { date: customDate } });
		}
	};

	return (
		<aside className="w-64 h-full border-r border-line bg-sidebar flex flex-col justify-between select-none">
			<div className="flex flex-col flex-1 overflow-y-auto">
				{/* App Title */}
				<div className="p-4 flex items-center gap-3 border-b border-line-soft">
					<div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-white">
						<Compass className="h-5 w-5" />
					</div>
					<div>
						<h1 className="text-sm font-bold text-fg-strong tracking-wide">
							Diário de Bordo
						</h1>
						<p className="text-[10px] text-fg-5 font-medium font-mono">
							obsidian-lite logs
						</p>
					</div>
				</div>

				{/* Vault Info */}
				<div className="px-3 py-3">
					<div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-surface border border-line-soft">
						<FolderCheck className="h-4.5 w-4.5 text-accent-soft flex-shrink-0" />
						<div className="min-w-0">
							<p className="text-[11px] font-semibold text-fg-2">Vault Ativo</p>
							<p className="text-[10px] text-fg-5 truncate font-mono">
								{rootHandle?.name || "Local Vault"}
							</p>
						</div>
					</div>
				</div>

				{/* Navigation Sections */}
				<div className="flex-1 px-2.5 py-2 flex flex-col gap-5">
					<div>
						<h2 className="px-3 text-[10px] font-bold text-fg-5 uppercase tracking-widest mb-2 font-mono">
							Visões
						</h2>
						<div className="flex flex-col gap-0.5">
							<Link
								to="/inbox"
								className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-120 border-l-2 ${
									isInboxActive
										? "bg-accent/10 text-fg-strong border-l-accent font-medium"
										: "text-fg-3 hover:bg-surface hover:text-fg-2 border-l-transparent"
								}`}
							>
								<Inbox
									className={`h-4 w-4 ${isInboxActive ? "text-accent-soft" : "text-fg-5"}`}
								/>
								Inbox
							</Link>
							<Link
								to="/week"
								className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-120 border-l-2 ${
									isWeekActive
										? "bg-accent/10 text-fg-strong border-l-accent font-medium"
										: "text-fg-3 hover:bg-surface hover:text-fg-2 border-l-transparent"
								}`}
							>
								<LayoutGrid
									className={`h-4 w-4 ${isWeekActive ? "text-accent-soft" : "text-fg-5"}`}
								/>
								Semana
							</Link>
						</div>
					</div>

					<div>
						<h2 className="px-3 text-[10px] font-bold text-fg-5 uppercase tracking-widest mb-2 font-mono">
							Navegação Diária
						</h2>
						<div className="flex flex-col gap-0.5">
							{sortedDays.map((day) => {
								const isActive = day === selectedDate;
								return (
									<Link
										key={day}
										to="/daily/$date"
										params={{ date: day }}
										className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-120 group border-l-2 ${
											isActive
												? "bg-accent/10 text-fg-strong border-l-accent font-medium"
												: "text-fg-3 hover:bg-surface hover:text-fg-2 border-l-transparent"
										}`}
									>
										<span className="flex items-center gap-2.5">
											<Calendar
												className={`h-4 w-4 ${isActive ? "text-accent-soft" : "text-fg-5"}`}
											/>
											{formatDateLabel(day)}
										</span>
										<ChevronRight
											className={`h-3.5 w-3.5 text-fg-5 transition-transform duration-120 group-hover:translate-x-0.5 ${isActive ? "text-accent-soft" : ""}`}
										/>
									</Link>
								);
							})}
						</div>
					</div>

					<div>
						<h2 className="px-3 text-[10px] font-bold text-fg-5 uppercase tracking-widest mb-2 font-mono">
							Notas Livres
						</h2>
						{freeNotes.length === 0 ? (
							<div className="px-3 py-2 text-xs text-fg-5 font-mono italic">
								Nenhuma nota criada
							</div>
						) : (
							<div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto pr-1">
								{freeNotes.map((note) => {
									const isActive = note.id === activeNoteId;
									return (
										<Link
											key={note.id}
											to="/note/$id"
											params={{ id: note.id }}
											className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-120 group border-l-2 ${
												isActive
													? "bg-accent/10 text-fg-strong border-l-accent font-medium"
													: "text-fg-3 hover:bg-surface hover:text-fg-2 border-l-transparent"
											}`}
										>
											<span className="flex items-center gap-2.5 truncate max-w-[170px]">
												<FileText
													className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-accent-soft" : "text-fg-5"}`}
												/>
												<span className="truncate">{note.title}</span>
											</span>
											<ChevronRight
												className={`h-3.5 w-3.5 flex-shrink-0 text-fg-5 transition-transform duration-120 group-hover:translate-x-0.5 ${isActive ? "text-accent-soft" : ""}`}
											/>
										</Link>
									);
								})}
							</div>
						)}
					</div>

					{/* Custom Date Selector */}
					<div className="px-3">
						<h2 className="text-[10px] font-bold text-fg-5 uppercase tracking-widest mb-2 font-mono">
							Outro Dia
						</h2>
						<form onSubmit={handleCustomDateSubmit} className="flex gap-1.5">
							<input
								type="date"
								value={customDate}
								onChange={(e) => setCustomDate(e.target.value)}
								className="flex-1 bg-surface border border-line-soft rounded-md text-xs px-2.5 py-1.5 text-fg focus:outline-none focus:border-accent transition-colors font-mono"
							/>
							<button
								type="submit"
								disabled={!customDate}
								className="px-2.5 bg-accent hover:bg-accent-strong text-white rounded-md text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
							>
								Ir
							</button>
						</form>
					</div>
				</div>
			</div>

			{/* Heatmap de Atividade */}
			<div className="heatmap">
				<div className="text-[10px] font-bold text-fg-5 uppercase tracking-widest font-mono">
					Atividade
				</div>
				<div className="grid">
					<span className="cell l1"></span>
					<span className="cell"></span>
					<span className="cell l2"></span>
					<span className="cell l3"></span>
					<span className="cell l1"></span>
					<span className="cell l2"></span>
					<span className="cell l3"></span>
					<span className="cell"></span>
					<span className="cell l1"></span>
					<span className="cell l3"></span>
					<span className="cell l2"></span>
					<span className="cell l3"></span>
					<span className="cell l1"></span>
					<span className="cell l2"></span>
					<span className="cell l3"></span>
					<span className="cell l1"></span>
					<span className="cell"></span>
					<span className="cell l2"></span>
					<span className="cell l3"></span>
					<span className="cell l3"></span>
					<span className="cell l1"></span>
					<span className="cell l2"></span>
					<span className="cell"></span>
					<span className="cell l3"></span>
					<span className="cell l2"></span>
					<span className="cell l3"></span>
					<span className="cell l3"></span>
					<span className="cell l2"></span>
					<span className="cell l3"></span>
					<span className="cell l1"></span>
					<span className="cell l3"></span>
					<span className="cell"></span>
					<span className="cell l2"></span>
					<span className="cell l3"></span>
					<span className="cell l1"></span>
					<span className="cell l2"></span>
					<span className="cell l3"></span>
					<span className="cell l3"></span>
					<span className="cell l2"></span>
				</div>
			</div>

			{/* Sidebar Footer */}
			<div className="p-3 border-t border-line-soft bg-footer">
				<button
					type="button"
					onClick={handleCloseVault}
					className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-all duration-120 cursor-pointer"
				>
					<LogOut className="h-4 w-4" />
					Fechar Vault
				</button>
			</div>
		</aside>
	);
}
