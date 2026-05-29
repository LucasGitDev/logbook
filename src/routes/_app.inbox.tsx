import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, Inbox, Sun } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect } from "react";
import { ProjectFilter } from "@/components/ProjectFilter";
import { TaskRow } from "@/components/TaskRow";
import { getLocalDateString } from "@/lib/dates";
import { dailyDateFromPath } from "@/lib/indexer";
import { filterTasksByProject, groupInboxTasks } from "@/lib/tasks";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";
import type { Task } from "@/types/vault";

export const Route = createFileRoute("/_app/inbox")({
	component: InboxView,
});

function InboxView() {
	const navigate = useNavigate();
	const tasks = useVaultStore((state) => state.tasks);
	const notes = useVaultStore((state) => state.notes);
	const activeProject = useUIStore((state) => state.activeProject);
	const openTab = useUIStore((state) => state.openTab);

	useEffect(() => {
		openTab({ id: "inbox", kind: "inbox", label: "Inbox", to: "/inbox" });
	}, [openTab]);

	const today = getLocalDateString();
	const filtered = filterTasksByProject(tasks, activeProject);
	const groups = groupInboxTasks(filtered, today);
	const total =
		groups.overdue.length +
		groups.today.length +
		groups.upcoming.length +
		groups.noDate.length;

	const openSource = (task: Task) => {
		const date = dailyDateFromPath(task.sourceFile);
		if (date) {
			navigate({ to: "/daily/$date", params: { date } });
			return;
		}
		const note = notes.find((n) => n.path === task.sourceFile);
		if (note) navigate({ to: "/note/$id", params: { id: note.id } });
	};

	const section = (
		title: string,
		Icon: ComponentType<{ className?: string }>,
		items: Task[],
		accent: string,
		refDate?: string,
	) => {
		if (items.length === 0) return null;
		return (
			<div>
				<h3 className="text-xs font-semibold text-fg-4 uppercase tracking-wider mb-3 flex items-center gap-2 font-mono">
					<Icon className={`h-3.5 w-3.5 ${accent}`} />
					<span>{title}</span>
					<span className="bg-surface-strong text-fg-4 text-[10px] px-1.5 py-0.5 rounded-full">
						{items.length}
					</span>
				</h3>
				<div className="flex flex-col gap-2">
					{items.map((task) => (
						<TaskRow
							key={task.id}
							task={task}
							referenceDate={refDate}
							onOpenSource={openSource}
						/>
					))}
				</div>
			</div>
		);
	};

	return (
		<main className="editor">
			<div className="editor-scroll">
				<div className="editor-container flex flex-col gap-6">
					<header className="flex items-center gap-2.5">
						<Inbox className="h-5 w-5 text-accent-soft" />
						<h1 className="text-lg font-bold text-fg-strong tracking-wide">
							Inbox
						</h1>
						<span className="text-xs text-fg-5 font-mono">
							{total} tarefa{total === 1 ? "" : "s"} aberta
							{total === 1 ? "" : "s"}
						</span>
					</header>

					<ProjectFilter />

					{total === 0 ? (
						<p className="text-sm text-fg-5 italic p-6 text-center bg-surface border border-dashed border-line-soft rounded-lg font-mono">
							Nenhuma tarefa aberta. 🎉
						</p>
					) : (
						<div className="flex flex-col gap-7">
							{section(
								"Atrasadas",
								AlertTriangle,
								groups.overdue,
								"text-danger",
							)}
							{section("Hoje", Sun, groups.today, "text-warn", today)}
							{section(
								"Próximas",
								CalendarClock,
								groups.upcoming,
								"text-success",
							)}
							{section("Sem data", Inbox, groups.noDate, "text-fg-5")}
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
