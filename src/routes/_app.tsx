import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { Statusbar } from "@/components/Statusbar";
import { TabBar } from "@/components/TabBar";
import { Topbar } from "@/components/Topbar";
import { readGitStatus } from "@/lib/git";
import { useVaultIndex } from "@/lib/useVault";
import { readSettings } from "@/lib/vault";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";

export const Route = createFileRoute("/_app")({
	component: AppLayout,
});

function AppLayout() {
	const navigate = useNavigate();
	const isLoaded = useVaultStore((state) => state.isLoaded);
	const rootHandle = useVaultStore((state) => state.rootHandle);
	const setGitBranch = useVaultStore((state) => state.setGitBranch);
	const sidebarOpen = useUIStore((state) => state.sidebarOpen);
	const toggleSidebar = useUIStore((state) => state.toggleSidebar);
	const applyTheme = useUIStore((state) => state.applyTheme);

	// Re-indexador automático ativo enquanto o vault está aberto (uma vez, na casca).
	useVaultIndex();

	// Sem vault aberto → volta pro picker.
	useEffect(() => {
		if (!isLoaded) {
			navigate({ to: "/" });
		}
	}, [isLoaded, navigate]);

	// Ao abrir o vault: lê preferências (tema) e status git do disco.
	useEffect(() => {
		if (!rootHandle) return;
		readSettings(rootHandle).then((s) => applyTheme(s.theme));
		readGitStatus(rootHandle).then((g) => setGitBranch(g.branch ?? null));
	}, [rootHandle, applyTheme, setGitBranch]);

	// No mobile, começa com a sidebar fechada (senão o drawer cobre a tela).
	useEffect(() => {
		if (window.matchMedia("(max-width: 767px)").matches) {
			useUIStore.setState({ sidebarOpen: false });
		}
	}, []);

	if (!isLoaded) return null;

	return (
		<div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-fg">
			<Topbar />
			<TabBar />

			<div className="flex-1 flex min-h-0 relative">
				{sidebarOpen && (
					<>
						{/* Backdrop — só no mobile; toque fecha o drawer. */}
						<button
							type="button"
							aria-label="Fechar menu"
							className="fixed inset-0 z-30 bg-black/40 md:hidden"
							onClick={toggleSidebar}
						/>
						{/* Drawer fixo no mobile, estático (em fluxo) em md+. */}
						<div className="fixed inset-y-0 left-0 z-40 md:static md:z-auto">
							<Sidebar />
						</div>
					</>
				)}
				<Outlet />
			</div>

			<Statusbar />
			<CommandPalette />
		</div>
	);
}
