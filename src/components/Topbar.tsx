import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";

export function Topbar() {
	const theme = useUIStore((state) => state.theme);
	const setTheme = useUIStore((state) => state.setTheme);
	const setCommandPaletteOpen = useUIStore(
		(state) => state.setCommandPaletteOpen,
	);
	const rootHandle = useVaultStore((state) => state.rootHandle);

	const [time, setTime] = useState("");

	useEffect(() => {
		const updateTime = () => {
			const now = new Date();
			setTime(
				now.toLocaleTimeString("pt-BR", {
					hour: "2-digit",
					minute: "2-digit",
				}),
			);
		};
		updateTime();
		const interval = setInterval(updateTime, 60000);
		return () => clearInterval(interval);
	}, []);

	const toggleTheme = () => {
		setTheme(theme === "default" ? "dracula-soft" : "default");
	};

	return (
		<div className="topbar">
			{rootHandle ? (
				<span className="vault">
					<span className="dot" />
					{rootHandle.name}
				</span>
			) : (
				<span className="vault text-fg-4">Nenhum Vault ativo</span>
			)}

			<span className="spacer" />

			<button
				type="button"
				className="cmdk-btn"
				onClick={() => setCommandPaletteOpen(true)}
			>
				buscar, ir para… <kbd>⌘K</kbd>
			</button>

			<span className="spacer" />

			<span>◷ {time}</span>

			<button type="button" className="tb-btn" onClick={toggleTheme}>
				◐ {theme}
			</button>
		</div>
	);
}
