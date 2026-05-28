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
			<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
				<span>Agenda do Dia</span>
				<span className="bg-[rgba(245,158,11,0.1)] text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full">
					{items.length}
				</span>
			</h3>

			{items.length === 0 ? (
				<p className="text-xs text-gray-500 italic p-4 text-center bg-[rgba(255,255,255,0.01)] border border-dashed border-[rgba(255,255,255,0.03)] rounded-lg">
					Sem compromissos hoje
				</p>
			) : (
				<div className="relative border-l border-[rgba(255,255,255,0.06)] pl-4 ml-2 flex flex-col gap-4">
					{items.map((item) => (
						<div key={item.id} className="relative group">
							{/* Ponto indicador da timeline */}
							<span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border border-amber-400 bg-amber-400/20 group-hover:scale-125 transition-transform duration-200" />

							<div className="flex flex-col gap-1">
								{/* Time and Duration Row */}
								<div className="flex items-center gap-2">
									<span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-[rgba(245,158,11,0.08)] px-2 py-0.5 rounded border border-[rgba(245,158,11,0.15)]">
										<Clock className="h-3 w-3" />
										{item.time}
									</span>

									{item.durationMin && (
										<span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-400 bg-[rgba(6,182,212,0.08)] px-1.5 py-0.5 rounded border border-[rgba(6,182,212,0.15)]">
											<Timer className="h-3 w-3" />
											{formatDuration(item.durationMin)}
										</span>
									)}
								</div>

								{/* Event Text */}
								<p className="text-sm text-gray-200 break-words mt-0.5 font-medium leading-relaxed">
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
