import { TaskRow } from "@/components/TaskRow";
import type { Task } from "@/types/vault";

interface TaskListProps {
	tasks: Task[];
	date: string;
}

export function TaskList({ tasks, date }: TaskListProps) {
	// Deduplica e divide as tarefas
	// 1. Agendadas para hoje (independente de onde foram criadas)
	const scheduledTasks = tasks.filter((t) => t.scheduledDate === date);

	// 2. Criadas hoje, mas que não estão agendadas para hoje (evita duplicatas)
	const createdTasks = tasks.filter(
		(t) => t.createdDate === date && t.scheduledDate !== date,
	);

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
						{scheduledTasks.map((task) => (
							<TaskRow key={task.id} task={task} referenceDate={date} />
						))}
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
						{createdTasks.map((task) => (
							<TaskRow key={task.id} task={task} referenceDate={date} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
