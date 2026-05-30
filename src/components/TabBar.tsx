import { useNavigate } from "@tanstack/react-router";
import {
	CalendarDays,
	CircleDot,
	FileText,
	Inbox,
	LayoutGrid,
	X,
} from "lucide-react";
import type { ComponentType } from "react";
import { type Tab, type TabKind, useUIStore } from "@/stores/uiStore";

const ICONS: Record<TabKind, ComponentType<{ className?: string }>> = {
	daily: CalendarDays,
	note: FileText,
	task: CircleDot,
	inbox: Inbox,
	week: LayoutGrid,
};

export function TabBar() {
	const navigate = useNavigate();
	const openTabs = useUIStore((state) => state.openTabs);
	const activeTabId = useUIStore((state) => state.activeTabId);
	const closeTab = useUIStore((state) => state.closeTab);

	if (openTabs.length === 0) return null;

	const goTo = (tab: Tab) => {
		// biome-ignore lint/suspicious/noExplicitAny: rota dinâmica vinda do estado
		navigate({ to: tab.to, params: tab.params } as any);
	};

	const handleClose = (e: React.MouseEvent, tab: Tab) => {
		e.stopPropagation();
		const idx = openTabs.findIndex((t) => t.id === tab.id);
		const neighbor = openTabs[idx - 1] ?? openTabs[idx + 1] ?? null;
		closeTab(tab.id);
		if (tab.id === activeTabId) {
			if (neighbor) goTo(neighbor);
			else navigate({ to: "/" });
		}
	};

	return (
		<div className="tabbar">
			{openTabs.map((tab) => {
				const Icon = ICONS[tab.kind];
				const isActive = tab.id === activeTabId;
				return (
					// biome-ignore lint/a11y/useKeyWithClickEvents: aba navegável, fallback de teclado é o ⌘K/sidebar
					// biome-ignore lint/a11y/noStaticElementInteractions: container de aba
					<div
						key={tab.id}
						className={`tab ${isActive ? "active" : ""}`}
						onClick={() => goTo(tab)}
						title={tab.label}
					>
						<Icon className="h-3.5 w-3.5 flex-shrink-0" />
						<span className="tab-label">{tab.label}</span>
						<button
							type="button"
							className="tab-close"
							onClick={(e) => handleClose(e, tab)}
							title="Fechar aba"
						>
							<X className="h-3 w-3" />
						</button>
					</div>
				);
			})}
		</div>
	);
}
