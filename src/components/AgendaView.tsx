import { Clock, Timer } from "lucide-react";
import type { AgendaItem } from "@/types/vault";

interface AgendaViewProps {
	items: AgendaItem[];
}

export function AgendaView({ items }: AgendaViewProps) {
	// Auxiliar para formatar duração amigável
	const formatDuration = (mins?: number) => {
		if (!mins) return "";
		if (mins < 60) return `${mins}min`;
		const hrs = Math.floor(mins / 60);
		const remaining = mins % 60;
		return remaining > 0 ? `${hrs}h ${remaining}m` : `${hrs}h`;
	};

	return (
		<div>
			<h3 className="text-xs font-semibold text-fg-4 uppercase tracking-wider mb-3 flex items-center justify-between font-mono">
				<span>Agenda do Dia</span>
				<span className="bg-warn/10 text-warn text-[10px] px-1.5 py-0.5 rounded-full">
					{items.length}
				</span>
			</h3>

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
