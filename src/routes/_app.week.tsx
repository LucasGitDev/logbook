import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Clock, LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";
import { ProjectFilter } from "@/components/ProjectFilter";
import { TaskRow } from "@/components/TaskRow";
import { addDays, getLocalDateString } from "@/lib/dates";
import { filterTasksByProject } from "@/lib/tasks";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";

export const Route = createFileRoute("/_app/week")({
	component: WeekView,
});

const WEEKDAY_FMT = (dateStr: string) => {
	const d = new Date(`${dateStr}T12:00:00`);
	const wd = d.toLocaleDateString("pt-BR", { weekday: "short" });
	const dm = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
	return { wd: wd.replace(".", ""), dm };
};

function WeekView() {
	const tasks = useVaultStore((state) => state.tasks);
	const agendaItems = useVaultStore((state) => state.agendaItems);
	const activeProject = useUIStore((state) => state.activeProject);
	const openTab = useUIStore((state) => state.openTab);

	const today = getLocalDateString();
	const [anchor, setAnchor] = useState(today);

	useEffect(() => {
		openTab({ id: "week", kind: "week", label: "Semana", to: "/week" });
	}, [openTab]);

	// 7 dias a partir do âncora (hoje por padrão) — hoje no topo, futuro abaixo.
	const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
	const filteredTasks = filterTasksByProject(tasks, activeProject);

	return (
		<main className="editor">
			<div className="editor-scroll">
				<div className="editor-container flex flex-col gap-6">
					<header className="flex items-center gap-3 flex-wrap">
						<LayoutGrid className="h-5 w-5 text-accent-soft" />
						<h1 className="text-lg font-bold text-fg-strong tracking-wide">
							Semana
						</h1>
						<span className="text-xs text-fg-5 font-mono">
							{days[0]} → {days[6]}
						</span>
						<div className="ml-auto flex items-center gap-1.5">
							<button
								type="button"
								onClick={() => setAnchor(addDays(anchor, -7))}
								className="p-1.5 rounded-md bg-surface hover:bg-surface-hover border border-line-soft text-fg-3 cursor-pointer transition-colors"
								title="Semana anterior"
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
							<button
								type="button"
								onClick={() => setAnchor(today)}
								className="px-2.5 py-1 rounded-md bg-surface hover:bg-surface-hover border border-line-soft text-fg-3 text-xs font-medium cursor-pointer transition-colors font-mono"
							>
								Hoje
							</button>
							<button
								type="button"
								onClick={() => setAnchor(addDays(anchor, 7))}
								className="p-1.5 rounded-md bg-surface hover:bg-surface-hover border border-line-soft text-fg-3 cursor-pointer transition-colors"
								title="Próxima semana"
							>
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					</header>

					<ProjectFilter />

					<div className="flex flex-col gap-4">
						{days.map((day) => {
							const dayTasks = filteredTasks.filter(
								(t) => t.scheduledDate === day,
							);
							const dayAgenda = [...agendaItems]
								.filter(
									(a) =>
										a.date === day &&
										(!activeProject || a.project === activeProject),
								)
								.sort((a, b) => a.time.localeCompare(b.time));
							const isToday = day === today;
							const { wd, dm } = WEEKDAY_FMT(day);

							return (
								<div
									key={day}
									className={`rounded-lg border bg-surface ${
										isToday ? "border-accent/40" : "border-line-soft"
									}`}
								>
									<div className="flex items-center justify-between px-4 py-2.5 border-b border-line-soft">
										<Link
											to="/daily/$date"
											params={{ date: day }}
											className="flex items-baseline gap-2 group"
										>
											<span
												className={`text-sm font-bold tracking-wide capitalize ${
													isToday ? "text-accent-soft" : "text-fg-strong"
												} group-hover:text-accent transition-colors`}
											>
												{wd}
											</span>
											<span className="text-[11px] text-fg-5 font-mono">
												{dm}
											</span>
										</Link>
										{(dayTasks.length > 0 || dayAgenda.length > 0) && (
											<span className="text-[10px] text-fg-5 font-mono">
												{dayTasks.length} task{dayTasks.length === 1 ? "" : "s"}
												{dayAgenda.length > 0
													? ` · ${dayAgenda.length} agenda`
													: ""}
											</span>
										)}
									</div>

									<div className="p-3 flex flex-col gap-2">
										{dayAgenda.map((a) => (
											<div
												key={a.id}
												className="flex items-center gap-2 text-xs text-fg-3"
											>
												<span className="inline-flex items-center gap-1 text-warn font-mono font-bold">
													<Clock className="h-3 w-3" />
													{a.time}
												</span>
												<span className="truncate">{a.text}</span>
											</div>
										))}

										{dayTasks.map((task) => (
											<TaskRow key={task.id} task={task} referenceDate={day} />
										))}

										{dayTasks.length === 0 && dayAgenda.length === 0 && (
											<p className="text-[11px] text-fg-5 italic font-mono py-1">
												—
											</p>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</main>
	);
}
