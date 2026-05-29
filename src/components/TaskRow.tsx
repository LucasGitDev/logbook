import {
	ArrowRight,
	Calendar,
	CalendarClock,
	CheckSquare,
	CornerUpRight,
	Hash,
	Square,
} from "lucide-react";
import { useRef } from "react";
import { addDays, getLocalDateString } from "@/lib/dates";
import { useRescheduleTask, useToggleTask } from "@/lib/useVault";
import type { Task } from "@/types/vault";

interface TaskRowProps {
	task: Task;
	/** Dia em contexto (daily view). Esconde o badge "agendada" se for o mesmo. */
	referenceDate?: string;
	/** Se passado, mostra um botão pra abrir o nó de origem (inbox/semana). */
	onOpenSource?: (task: Task) => void;
}

export function TaskRow({ task, referenceDate, onOpenSource }: TaskRowProps) {
	const toggleTaskMutation = useToggleTask();
	const rescheduleMutation = useRescheduleTask();
	const dateInputRef = useRef<HTMLInputElement>(null);

	const isDone = task.status === "done";
	const isToggling =
		toggleTaskMutation.isPending &&
		toggleTaskMutation.variables?.task.id === task.id;
	const isRescheduling =
		rescheduleMutation.isPending &&
		rescheduleMutation.variables?.task.id === task.id;

	const handleToggle = () => {
		toggleTaskMutation.mutate({
			task,
			newStatus: task.status === "open" ? "done" : "open",
		});
	};

	const reschedule = (date: string) => {
		if (date) rescheduleMutation.mutate({ task, date });
	};

	const today = getLocalDateString();

	return (
		<div
			className={`flex items-start gap-3 p-3 rounded-lg border border-line-soft bg-surface hover:bg-surface-hover transition-all duration-120 group ${
				isDone ? "opacity-60" : ""
			} ${isToggling || isRescheduling ? "opacity-50" : ""}`}
		>
			<button
				type="button"
				onClick={handleToggle}
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

					{task.scheduledDate && task.scheduledDate !== referenceDate && (
						<span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/8 border border-success/15 text-success">
							<Calendar className="h-2.5 w-2.5" />
							{task.scheduledDate}
						</span>
					)}

					{task.createdDate && task.createdDate !== referenceDate && (
						<span className="inline-flex items-center gap-1 text-[10px] text-fg-5">
							Criada: {task.createdDate}
						</span>
					)}
				</div>

				{/* Ações rápidas (aparecem no hover) — carry-over */}
				{!isDone && (
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
