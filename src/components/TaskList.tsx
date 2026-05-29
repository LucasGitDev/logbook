import { Calendar, CheckSquare, Hash, Square } from "lucide-react";
import { useToggleTask } from "@/lib/useVault";
import type { Task } from "@/types/vault";

interface TaskListProps {
	tasks: Task[];
	date: string;
}

export function TaskList({ tasks, date }: TaskListProps) {
	const toggleTaskMutation = useToggleTask();

	// Deduplica e divide as tarefas
	// 1. Agendadas para hoje (independente de onde foram criadas)
	const scheduledTasks = tasks.filter((t) => t.scheduledDate === date);

	// 2. Criadas hoje, mas que não estão agendadas para hoje (para evitar duplicatas)
	const createdTasks = tasks.filter(
		(t) => t.createdDate === date && t.scheduledDate !== date,
	);

	const handleToggle = (task: Task) => {
		const newStatus = task.status === "open" ? "done" : "open";
		toggleTaskMutation.mutate({ task, newStatus });
	};

	const renderTaskRow = (task: Task) => {
		const isDone = task.status === "done";
		const isToggling =
			toggleTaskMutation.isPending &&
			toggleTaskMutation.variables?.task.id === task.id;

		return (
			<div
				key={task.id}
				className={`flex items-start gap-3 p-3 rounded-lg border border-line-soft bg-surface hover:bg-surface-hover transition-all duration-120 group ${
					isDone ? "opacity-60" : ""
				} ${isToggling ? "opacity-50" : ""}`}
			>
				<button
					type="button"
					onClick={() => handleToggle(task)}
					disabled={isToggling}
					className="mt-0.5 focus:outline-none flex-shrink-0"
				>
					{isDone ? (
						<CheckSquare className="h-4.5 w-4.5 text-success fill-success/10 cursor-pointer transition-all duration-120 hover:scale-110" />
					) : (
						<Square className="h-4.5 w-4.5 text-fg-5 cursor-pointer transition-all duration-120 hover:text-accent hover:scale-110" />
					)}
				</button>

				<div className="flex-1 min-w-0">
					<p
						className={`text-sm text-fg break-words ${
							isDone ? "line-through text-fg-5" : ""
						}`}
					>
						{task.text}
					</p>

					{/* Metadata Row */}
					<div className="flex flex-wrap items-center gap-2 mt-1.5">
						{task.project && (
							<span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-pink/10 border border-pink/20 text-pink">
								<Hash className="h-2.5 w-2.5" />
								{task.project}
							</span>
						)}

						{task.scheduledDate && task.scheduledDate !== date && (
							<span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/8 border border-success/15 text-success">
								<Calendar className="h-2.5 w-2.5" />
								Agendada: {task.scheduledDate}
							</span>
						)}

						{task.createdDate && task.createdDate !== date && (
							<span className="inline-flex items-center gap-1 text-[10px] text-fg-5">
								Criada em: {task.createdDate}
							</span>
						)}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="flex flex-col gap-6">
			{/* Seção: Agendadas para hoje */}
			<div>
				<h3 className="text-xs font-semibold text-fg-4 uppercase tracking-wider mb-3 flex items-center justify-between font-mono">
					<span>Agendadas para Hoje</span>
					<span className="bg-accent/10 text-accent-soft text-[10px] px-1.5 py-0.5 rounded-full">
						{scheduledTasks.length}
					</span>
				</h3>
				{scheduledTasks.length === 0 ? (
					<p className="text-xs text-fg-5 italic p-3 text-center bg-surface border border-dashed border-line-soft rounded-lg font-mono">
						Nenhuma tarefa agendada
					</p>
				) : (
					<div className="flex flex-col gap-2">
						{scheduledTasks.map(renderTaskRow)}
					</div>
				)}
			</div>

			{/* Seção: Criadas hoje */}
			<div>
				<h3 className="text-xs font-semibold text-fg-4 uppercase tracking-wider mb-3 flex items-center justify-between font-mono">
					<span>Criadas Hoje</span>
					<span className="bg-surface-strong text-fg-4 text-[10px] px-1.5 py-0.5 rounded-full">
						{createdTasks.length}
					</span>
				</h3>
				{createdTasks.length === 0 ? (
					<p className="text-xs text-fg-5 italic p-3 text-center bg-surface border border-dashed border-line-soft rounded-lg font-mono">
						Nenhuma outra tarefa criada
					</p>
				) : (
					<div className="flex flex-col gap-2">
						{createdTasks.map(renderTaskRow)}
					</div>
				)}
			</div>
		</div>
	);
}
