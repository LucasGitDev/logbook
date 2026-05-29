import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { Statusbar } from "@/components/Statusbar";
import { TabBar } from "@/components/TabBar";
import { Topbar } from "@/components/Topbar";
import { useVaultIndex } from "@/lib/useVault";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";

export const Route = createFileRoute("/_app")({
	component: AppLayout,
});

function AppLayout() {
	const navigate = useNavigate();
	const isLoaded = useVaultStore((state) => state.isLoaded);
	const sidebarOpen = useUIStore((state) => state.sidebarOpen);

	// Re-indexador automático ativo enquanto o vault está aberto (uma vez, na casca).
	useVaultIndex();

	// Sem vault aberto → volta pro picker.
	useEffect(() => {
		if (!isLoaded) {
			navigate({ to: "/" });
		}
	}, [isLoaded, navigate]);

	if (!isLoaded) return null;

	return (
		<div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-fg">
			<Topbar />
			<TabBar />

			<div className="flex-1 flex min-h-0">
				{sidebarOpen && <Sidebar />}
				<Outlet />
			</div>

			<Statusbar />
			<CommandPalette />
		</div>
	);
}
