import { useVaultStore } from "@/stores/vaultStore";

export function Statusbar() {
	const activeFilePath = useVaultStore((state) => state.activeFilePath);
	const activeWordCount = useVaultStore((state) => state.activeWordCount);
	const activeSaveStatus = useVaultStore((state) => state.activeSaveStatus);
	const activeCursorPos = useVaultStore((state) => state.activeCursorPos);

	return (
		<div className="statusbar">
			{activeFilePath ? (
				<span className="sb-cell accent">⎇ {activeFilePath}</span>
			) : (
				<span className="sb-cell text-fg-4">Nenhum arquivo ativo</span>
			)}

			<span className="sb-cell">{activeWordCount} palavras</span>

			{activeSaveStatus === "saved" && (
				<span className="sb-cell ok">
					<span className="h-1.5 w-1.5 rounded-full bg-success" />
					salvo
				</span>
			)}
			{activeSaveStatus === "saving" && (
				<span className="sb-cell text-accent-soft">
					<span className="h-1.5 w-1.5 rounded-full bg-accent-soft" />
					salvando...
				</span>
			)}
			{activeSaveStatus === "unsaved" && (
				<span className="sb-cell text-warn">
					<span className="h-1.5 w-1.5 rounded-full bg-warn" />
					não salvo
				</span>
			)}

			<span className="spacer" />

			<span className="sb-cell">markdown</span>
			<span className="sb-cell">UTF-8</span>
			<span className="sb-cell">
				Ln {activeCursorPos.line}, Col {activeCursorPos.col}
			</span>
		</div>
	);
}
