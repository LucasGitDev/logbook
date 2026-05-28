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
				className={`flex items-start gap-3 p-3 rounded-lg border border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.03)] transition-all duration-200 group ${
					isDone ? "opacity-60" : ""
				} ${isToggling ? "animate-pulse" : ""}`}
			>
				<button
					type="button"
					onClick={() => handleToggle(task)}
					disabled={isToggling}
					className="mt-0.5 focus:outline-none flex-shrink-0"
				>
					{isDone ? (
						<CheckSquare className="h-4.5 w-4.5 text-emerald-400 fill-emerald-400/10 cursor-pointer transition-all duration-200 hover:scale-110" />
					) : (
						<Square className="h-4.5 w-4.5 text-gray-500 cursor-pointer transition-all duration-200 hover:text-indigo-400 hover:scale-110" />
					)}
				</button>

				<div className="flex-1 min-w-0">
					<p
						className={`text-sm text-gray-200 break-words ${
							isDone ? "line-through text-gray-500" : ""
						}`}
					>
						{task.text}
					</p>

					{/* Metadata Row */}
					<div className="flex flex-wrap items-center gap-2 mt-1.5">
						{task.project && (
							<span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(236,72,153,0.1)] border border-[rgba(236,72,153,0.2)] text-pink-400">
								<Hash className="h-2.5 w-2.5" />
								{task.project}
							</span>
						)}

						{task.scheduledDate && task.scheduledDate !== date && (
							<span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.15)] text-emerald-400">
								<Calendar className="h-2.5 w-2.5" />
								Agendada: {task.scheduledDate}
							</span>
						)}

						{task.createdDate && task.createdDate !== date && (
							<span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
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
				<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
					<span>Agendadas para Hoje</span>
					<span className="bg-[rgba(99,102,241,0.1)] text-indigo-400 text-[10px] px-1.5 py-0.5 rounded-full">
						{scheduledTasks.length}
					</span>
				</h3>
				{scheduledTasks.length === 0 ? (
					<p className="text-xs text-gray-500 italic p-3 text-center bg-[rgba(255,255,255,0.01)] border border-dashed border-[rgba(255,255,255,0.03)] rounded-lg">
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
				<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
					<span>Criadas Hoje</span>
					<span className="bg-[rgba(255,255,255,0.06)] text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">
						{createdTasks.length}
					</span>
				</h3>
				{createdTasks.length === 0 ? (
					<p className="text-xs text-gray-500 italic p-3 text-center bg-[rgba(255,255,255,0.01)] border border-dashed border-[rgba(255,255,255,0.03)] rounded-lg">
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
