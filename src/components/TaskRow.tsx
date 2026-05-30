import { useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	ArrowUpRight,
	Calendar,
	CalendarClock,
	CheckSquare,
	CircleDot,
	CornerUpRight,
	Flag,
	Hash,
	Hourglass,
	Sparkles,
	Square,
	XSquare,
} from "lucide-react";
import { useRef } from "react";
import { addDays, getLocalDateString } from "@/lib/dates";
import {
	usePromoteTask,
	useRescheduleTask,
	useToggleTask,
} from "@/lib/useVault";
import type { Priority, Task, TaskStatus } from "@/types/vault";

interface TaskRowProps {
	task: Task;
	/** Dia em contexto (daily view). Esconde o badge "agendada" se for o mesmo. */
	referenceDate?: string;
	/** Se passado, mostra um botão pra abrir o nó de origem (inbox/semana). */
	onOpenSource?: (task: Task) => void;
}

/** Clique no checkbox cicla open → doing → done → open. Cancelled fica no painel do nó. */
const nextStatus = (s: TaskStatus): TaskStatus =>
	s === "open" ? "doing" : s === "doing" ? "done" : "open";

const PRIORITY_LABEL: Record<Priority, string> = {
	high: "Alta",
	medium: "Média",
	low: "Baixa",
};

export function TaskRow({ task, referenceDate, onOpenSource }: TaskRowProps) {
	const navigate = useNavigate();
	const toggleTaskMutation = useToggleTask();
	const rescheduleMutation = useRescheduleTask();
	const promoteMutation = usePromoteTask();
	const dateInputRef = useRef<HTMLInputElement>(null);

	const isDone = task.status === "done";
	const isCancelled = task.status === "cancelled";
	const isNode = task.nodeId !== undefined;
	const isToggling =
		toggleTaskMutation.isPending &&
		toggleTaskMutation.variables?.task.id === task.id;
	const isRescheduling =
		rescheduleMutation.isPending &&
		rescheduleMutation.variables?.task.id === task.id;
	const isPromoting =
		promoteMutation.isPending && promoteMutation.variables?.task.id === task.id;

	const handleToggle = () => {
		toggleTaskMutation.mutate({ task, newStatus: nextStatus(task.status) });
	};

	const reschedule = (date: string) => {
		if (date) rescheduleMutation.mutate({ task, date });
	};

	const today = getLocalDateString();
	const label = task.title ?? task.text;

	const StatusIcon = () => {
		if (isDone)
			return (
				<CheckSquare className="h-4.5 w-4.5 text-success fill-success/10 cursor-pointer transition-all duration-120 hover:scale-110" />
			);
		if (isCancelled)
			return (
				<XSquare className="h-4.5 w-4.5 text-danger/70 cursor-pointer transition-all duration-120 hover:scale-110" />
			);
		if (task.status === "doing")
			return (
				<CircleDot className="h-4.5 w-4.5 text-warn cursor-pointer transition-all duration-120 hover:scale-110" />
			);
		return (
			<Square className="h-4.5 w-4.5 text-fg-5 cursor-pointer transition-all duration-120 hover:text-accent hover:scale-110" />
		);
	};

	return (
		<div
			className={`flex items-start gap-3 p-3 rounded-lg border border-line-soft bg-surface hover:bg-surface-hover transition-all duration-120 group ${
				isDone || isCancelled ? "opacity-60" : ""
			} ${isToggling || isRescheduling || isPromoting ? "opacity-50" : ""}`}
		>
			<button
				type="button"
				onClick={handleToggle}
				disabled={isToggling}
				className="mt-0.5 focus:outline-none flex-shrink-0"
				title="Alternar status (aberta → em curso → feita)"
			>
				<StatusIcon />
			</button>

			<div className="flex-1 min-w-0">
				<p
					className={`text-sm text-fg break-words ${
						isDone || isCancelled ? "line-through text-fg-5" : ""
					}`}
				>
					{isNode && (
						<Sparkles className="inline h-3 w-3 mr-1 text-accent-soft align-[-1px]" />
					)}
					{label}
				</p>

				{/* Metadata Row */}
				<div className="flex flex-wrap items-center gap-2 mt-1.5">
					{task.priority && (
						<span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-pink/10 border border-pink/20 text-pink">
							<Flag className="h-2.5 w-2.5" />
							{PRIORITY_LABEL[task.priority]}
						</span>
					)}

					{task.effort && (
						<span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan/8 border border-cyan/15 text-cyan">
							<Hourglass className="h-2.5 w-2.5" />
							{task.effort}
						</span>
					)}

					{task.project && (
						<span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-pink/10 border border-pink/20 text-pink">
							<Hash className="h-2.5 w-2.5" />
							{task.project}
						</span>
					)}

					{task.scheduledDate && task.scheduledDate !== referenceDate && (
						<span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/8 border border-success/15 text-success">
							<Calendar className="h-2.5 w-2.5" />
							{task.scheduledDate}
						</span>
					)}

					{task.createdDate &&
						task.createdDate !== referenceDate &&
						!isNode && (
							<span className="inline-flex items-center gap-1 text-[10px] text-fg-5">
								Criada: {task.createdDate}
							</span>
						)}
				</div>

				{/* Ações rápidas (aparecem no hover) */}
				{!isDone && !isCancelled && (
					<div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-120">
						<button
							type="button"
							onClick={() => reschedule(addDays(today, 1))}
							disabled={isRescheduling}
							className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-strong text-fg-4 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer font-mono"
							title="Reagendar para amanhã"
						>
							<CornerUpRight className="h-2.5 w-2.5" />
							Amanhã
						</button>
						<button
							type="button"
							onClick={() => reschedule(addDays(today, 7))}
							disabled={isRescheduling}
							className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-strong text-fg-4 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer font-mono"
							title="Reagendar para daqui a uma semana"
						>
							+1 sem
						</button>
						<button
							type="button"
							onClick={() => dateInputRef.current?.showPicker()}
							disabled={isRescheduling}
							className="relative inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-strong text-fg-4 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer font-mono"
							title="Escolher data"
						>
							<CalendarClock className="h-2.5 w-2.5" />
							Data
							<input
								ref={dateInputRef}
								type="date"
								value={task.scheduledDate ?? ""}
								onChange={(e) => reschedule(e.target.value)}
								className="absolute inset-0 w-px h-px opacity-0 pointer-events-none"
								tabIndex={-1}
								aria-hidden="true"
							/>
						</button>

						{/* Promover linha-task → nó forte (one-way). Só p/ linha-task. */}
						{!isNode && (
							<button
								type="button"
								onClick={() => promoteMutation.mutate({ task })}
								disabled={isPromoting}
								className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-strong text-fg-4 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer font-mono"
								title="Promover a tarefa forte (cria um nó)"
							>
								<Sparkles className="h-2.5 w-2.5" />
								Promover
							</button>
						)}

						{/* Task-nó: abrir a rota do nó. */}
						{isNode && task.nodeId && (
							<button
								type="button"
								onClick={() =>
									navigate({
										to: "/task/$id",
										params: { id: task.nodeId ?? "" },
									})
								}
								className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-strong text-fg-4 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer font-mono"
								title="Abrir a tarefa"
							>
								<ArrowUpRight className="h-2.5 w-2.5" />
								Abrir
							</button>
						)}

						{onOpenSource && (
							<button
								type="button"
								onClick={() => onOpenSource(task)}
								className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md text-fg-5 hover:text-accent transition-colors cursor-pointer font-mono"
								title="Abrir origem"
							>
								Abrir
								<ArrowRight className="h-2.5 w-2.5" />
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
