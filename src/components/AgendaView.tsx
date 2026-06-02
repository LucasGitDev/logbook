import { Clock, Hash, Plus, Timer, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useAddAgenda } from "@/lib/useVault";
import type { AgendaItem } from "@/types/vault";

interface AgendaViewProps {
	items: AgendaItem[];
	date: string;
}

export function AgendaView({ items, date }: AgendaViewProps) {
	const [formOpen, setFormOpen] = useState(false);
	const [text, setText] = useState("");
	const [time, setTime] = useState("09:00");
	const [duration, setDuration] = useState("");
	const addAgenda = useAddAgenda();

	// Auxiliar para formatar duração amigável
	const formatDuration = (mins?: number) => {
		if (!mins) return "";
		if (mins < 60) return `${mins}min`;
		const hrs = Math.floor(mins / 60);
		const remaining = mins % 60;
		return remaining > 0 ? `${hrs}h ${remaining}m` : `${hrs}h`;
	};

	const resetForm = () => {
		setText("");
		setTime("09:00");
		setDuration("");
		setFormOpen(false);
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const trimmed = text.trim();
		if (!trimmed || !time) return;
		const durationMin = duration ? Number(duration) : undefined;
		addAgenda.mutate(
			{
				date,
				text: trimmed,
				time,
				durationMin: Number.isFinite(durationMin) ? durationMin : undefined,
			},
			{ onSuccess: resetForm },
		);
	};

	return (
		<div>
			<h3 className="text-xs font-semibold text-fg-4 uppercase tracking-wider mb-3 flex items-center justify-between font-mono">
				<span>Agenda do Dia</span>
				<span className="flex items-center gap-2">
					<span className="bg-warn/10 text-warn text-[10px] px-1.5 py-0.5 rounded-full">
						{items.length}
					</span>
					<button
						type="button"
						onClick={() => setFormOpen((v) => !v)}
						title={formOpen ? "Cancelar" : "Novo compromisso"}
						className="h-5 w-5 inline-flex items-center justify-center rounded text-fg-4 hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
					>
						{formOpen ? (
							<X className="h-3.5 w-3.5" />
						) : (
							<Plus className="h-3.5 w-3.5" />
						)}
					</button>
				</span>
			</h3>

			{formOpen && (
				<form
					onSubmit={handleSubmit}
					className="mb-3 p-3 bg-surface border border-line-soft rounded-lg flex flex-col gap-2"
				>
					<input
						type="text"
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Compromisso (ex: 1:1 com gestor)"
						// biome-ignore lint/a11y/noAutofocus: foco ao abrir o form é o esperado
						autoFocus
						className="w-full bg-bg border border-line-soft rounded px-2 py-1.5 text-sm text-fg placeholder:text-fg-5 focus:outline-none focus:border-accent font-mono"
					/>
					<div className="flex items-center gap-2">
						<label className="flex items-center gap-1 text-[10px] text-fg-5 font-mono uppercase tracking-wider">
							<Clock className="h-3 w-3" />
							<input
								type="time"
								value={time}
								onChange={(e) => setTime(e.target.value)}
								className="bg-bg border border-line-soft rounded px-1.5 py-1 text-xs text-fg focus:outline-none focus:border-accent font-mono"
							/>
						</label>
						<label className="flex items-center gap-1 text-[10px] text-fg-5 font-mono uppercase tracking-wider">
							<Timer className="h-3 w-3" />
							<input
								type="number"
								min="0"
								step="5"
								value={duration}
								onChange={(e) => setDuration(e.target.value)}
								placeholder="min"
								className="w-16 bg-bg border border-line-soft rounded px-1.5 py-1 text-xs text-fg placeholder:text-fg-5 focus:outline-none focus:border-accent font-mono"
							/>
						</label>
					</div>
					<button
						type="submit"
						disabled={!text.trim() || addAgenda.isPending}
						className="w-full py-1.5 bg-accent hover:bg-accent-strong text-white rounded text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 font-mono"
					>
						{addAgenda.isPending ? "Adicionando..." : "Adicionar"}
					</button>
				</form>
			)}

			{items.length === 0 ? (
				<p className="text-xs text-fg-5 italic p-4 text-center bg-surface border border-dashed border-line-soft rounded-lg font-mono">
					Sem compromissos hoje
				</p>
			) : (
				<div className="relative border-l border-line pl-4 ml-2 flex flex-col gap-4">
					{items.map((item) => (
						<div key={item.id} className="relative group">
							{/* Ponto indicador da timeline */}
							<span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border border-warn bg-warn/25 group-hover:scale-125 transition-transform duration-120" />

							<div className="flex flex-col gap-1">
								{/* Time and Duration Row */}
								<div className="flex items-center gap-2">
									<span className="inline-flex items-center gap-1 text-xs font-bold text-warn bg-warn/8 px-2 py-0.5 rounded border border-warn/15 font-mono">
										<Clock className="h-3 w-3" />
										{item.time}
									</span>

									{item.durationMin && (
										<span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan bg-cyan/8 px-1.5 py-0.5 rounded border border-cyan/15 font-mono">
											<Timer className="h-3 w-3" />
											{formatDuration(item.durationMin)}
										</span>
									)}

									{item.project && (
										<span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-pink/10 border border-pink/20 text-pink">
											<Hash className="h-2.5 w-2.5" />
											{item.project}
										</span>
									)}
								</div>

								{/* Event Text */}
								<p className="text-sm text-fg break-words mt-0.5 font-medium leading-relaxed">
									{item.text}
								</p>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
