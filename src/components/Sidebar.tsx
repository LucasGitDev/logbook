import { Link, useNavigate } from "@tanstack/react-router";
import {
	Calendar,
	ChevronRight,
	Compass,
	FolderCheck,
	LogOut,
} from "lucide-react";
import { useState } from "react";
import { getLocalDateString } from "@/lib/dates";
import { clearVaultHandle } from "@/lib/idb";
import { useVaultStore } from "@/stores/vaultStore";

interface SidebarProps {
	selectedDate: string;
}

export function Sidebar({ selectedDate }: SidebarProps) {
	const navigate = useNavigate();
	const rootHandle = useVaultStore((state) => state.rootHandle);
	const resetVault = useVaultStore((state) => state.reset);
	const [customDate, setCustomDate] = useState("");

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
		navigate({ to: "/" });
	};

	const handleCustomDateSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (customDate) {
			navigate({ to: "/daily/$date", params: { date: customDate } });
		}
	};

	return (
		<aside className="w-64 h-full border-r border-[rgba(255,255,255,0.06)] bg-[rgba(10,10,12,0.65)] backdrop-blur-xl flex flex-col justify-between">
			<div className="flex flex-col flex-1 overflow-y-auto">
				{/* App Title */}
				<div className="p-6 flex items-center gap-3 border-b border-[rgba(255,255,255,0.04)]">
					<div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
						<Compass className="h-5 w-5 text-white" />
					</div>
					<div>
						<h1 className="text-base font-bold text-white tracking-wide">
							Diário de Bordo
						</h1>
						<p className="text-[10px] text-gray-500 font-medium">
							Obsidian-lite Personal Logs
						</p>
					</div>
				</div>

				{/* Vault Info */}
				<div className="px-4 py-4">
					<div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
						<FolderCheck className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0" />
						<div className="min-w-0">
							<p className="text-[11px] font-semibold text-gray-300">
								Vault Ativo
							</p>
							<p className="text-[10px] text-gray-500 truncate font-mono">
								{rootHandle?.name || "Local Vault"}
							</p>
						</div>
					</div>
				</div>

				{/* Navigation Sections */}
				<div className="flex-1 px-3 py-2 flex flex-col gap-5">
					<div>
						<h2 className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
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
										className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${
											isActive
												? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium"
												: "text-gray-400 hover:bg-[rgba(255,255,255,0.02)] border border-transparent"
										}`}
									>
										<span className="flex items-center gap-2.5">
											<Calendar
												className={`h-4 w-4 ${isActive ? "text-indigo-400" : "text-gray-500"}`}
											/>
											{formatDateLabel(day)}
										</span>
										<ChevronRight
											className={`h-3.5 w-3.5 text-gray-600 transition-transform duration-200 group-hover:translate-x-0.5 ${isActive ? "text-indigo-400" : ""}`}
										/>
									</Link>
								);
							})}
						</div>
					</div>

					{/* Custom Date Selector */}
					<div className="px-3">
						<h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
							Outro Dia
						</h2>
						<form onSubmit={handleCustomDateSubmit} className="flex gap-1.5">
							<input
								type="date"
								value={customDate}
								onChange={(e) => setCustomDate(e.target.value)}
								className="flex-1 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-md text-xs px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-indigo-500 transition-colors"
							/>
							<button
								type="submit"
								disabled={!customDate}
								className="px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
							>
								Ir
							</button>
						</form>
					</div>
				</div>
			</div>

			{/* Sidebar Footer */}
			<div className="p-4 border-t border-[rgba(255,255,255,0.04)] bg-[rgba(0,0,0,0.15)]">
				<button
					type="button"
					onClick={handleCloseVault}
					className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200 cursor-pointer"
				>
					<LogOut className="h-4 w-4" />
					Fechar Vault
				</button>
			</div>
		</aside>
	);
}
