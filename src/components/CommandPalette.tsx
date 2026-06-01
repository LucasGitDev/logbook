import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { addDays, getLocalDateString } from "@/lib/dates";
import { updateFrontmatterFields } from "@/lib/frontmatter";
import { clearVaultHandle } from "@/lib/idb";
import { dailyDateFromPath, reindexVault } from "@/lib/indexer";
import { deleteFile, readFile, writeFile } from "@/lib/vault";
import { useUIStore } from "@/stores/uiStore";
import { useVaultStore } from "@/stores/vaultStore";

interface CommandItem {
	icon: string;
	label: string;
	keyHint?: string;
	action: () => void;
}

export function CommandPalette() {
	const navigate = useNavigate();
	const isOpen = useUIStore((state) => state.commandPaletteOpen);
	const setIsOpen = useUIStore((state) => state.setCommandPaletteOpen);
	const theme = useUIStore((state) => state.theme);
	const setTheme = useUIStore((state) => state.setTheme);
	const toggleSidebar = useUIStore((state) => state.toggleSidebar);
	const togglePanel = useUIStore((state) => state.togglePanel);
	const toggleFocusMode = useUIStore((state) => state.toggleFocusMode);
	const openCreateModal = useUIStore((state) => state.openCreateModal);
	const resetVault = useVaultStore((state) => state.reset);
	const rootHandle = useVaultStore((state) => state.rootHandle);
	const notes = useVaultStore((state) => state.notes);
	const queryClient = useQueryClient();
	const activeFilePath = useVaultStore((state) => state.activeFilePath);

	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);

	const inputRef = useRef<HTMLInputElement>(null);
	const overlayRef = useRef<HTMLDivElement>(null);

	// Focus input on open
	useEffect(() => {
		if (isOpen) {
			setQuery("");
			setSelectedIndex(0);
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [isOpen]);

	// Register global shortcut key handlers
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const isMeta = e.metaKey || e.ctrlKey;

			// Toggle command palette: Cmd+K / Ctrl+K
			if (isMeta && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setIsOpen(!isOpen);
				return;
			}

			// Toggle sidebar: Cmd+B / Ctrl+B
			if (isMeta && e.key.toLowerCase() === "b") {
				e.preventDefault();
				toggleSidebar();
				return;
			}

			// Toggle right panel: Cmd+J / Ctrl+J
			if (isMeta && e.key.toLowerCase() === "j") {
				e.preventDefault();
				togglePanel();
				return;
			}

			// Focus mode: Cmd+.
			if (isMeta && e.key === ".") {
				e.preventDefault();
				toggleFocusMode();
				return;
			}

			// Navegar dias: Cmd+Shift+← / Cmd+Shift+→ (anterior/próximo).
			// Ignorado enquanto o foco está no editor/input (não rouba navegação).
			if (
				isMeta &&
				e.shiftKey &&
				(e.key === "ArrowLeft" || e.key === "ArrowRight")
			) {
				const el = document.activeElement;
				const typing =
					el instanceof HTMLElement &&
					(el.isContentEditable ||
						el.closest(".cm-editor") !== null ||
						el.tagName === "INPUT" ||
						el.tagName === "TEXTAREA");
				if (typing) return;
				const m = /^\/daily\/(\d{4}-\d{2}-\d{2})/.exec(
					window.location.pathname,
				);
				if (!m?.[1]) return;
				e.preventDefault();
				const next = addDays(m[1], e.key === "ArrowLeft" ? -1 : 1);
				navigate({ to: "/daily/$date", params: { date: next } });
				return;
			}

			// Fechar aba ativa: Cmd+W (estilo VSCode).
			// ⚠️ Reservado pelo navegador — best-effort; fallback = botão × na aba.
			if (isMeta && e.key.toLowerCase() === "w") {
				const { activeTabId, closeTab } = useUIStore.getState();
				if (activeTabId) {
					e.preventDefault();
					closeTab(activeTabId);
				}
				return;
			}

			// Nova nota livre: Cmd+N → abre o modal de criação.
			// ⚠️ Reservado pelo navegador (nova janela) — best-effort; fallback = ⌘K / Sidebar.
			if (isMeta && !e.shiftKey && e.key.toLowerCase() === "n") {
				if (!useVaultStore.getState().rootHandle) return;
				e.preventDefault();
				useUIStore.getState().openCreateModal("note");
				return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		isOpen,
		setIsOpen,
		toggleSidebar,
		togglePanel,
		toggleFocusMode,
		navigate,
	]);

	if (!isOpen) return null;

	const handleCloseVault = () => {
		clearVaultHandle();
		resetVault();
		navigate({ to: "/" });
	};

	const handleRenameActiveNote = async () => {
		if (!activeFilePath) return;
		const activeNote = notes.find((n) => n.path === activeFilePath);
		if (!activeNote) return;

		const newTitle = prompt(
			"Digite o novo título para esta nota:",
			activeNote.title,
		);
		if (!newTitle) return;
		const cleanTitle = newTitle.trim();
		if (!cleanTitle || cleanTitle === activeNote.title) return;

		// Verifica se já existe outra nota com esse título
		const existingNote = notes.find(
			(n) =>
				n.title.toLowerCase() === cleanTitle.toLowerCase() &&
				n.id !== activeNote.id,
		);
		if (existingNote) {
			alert(`Uma nota com o título "${cleanTitle}" já existe.`);
			return;
		}

		try {
			if (!rootHandle) return;

			// 1. Lê o conteúdo atual
			const content = await readFile(rootHandle, activeFilePath);
			if (content === null) return;

			// 2. Adiciona o título antigo aos aliases da nota para preservar links (rename-safe)
			const oldAliases = activeNote.aliases || [];
			const newAliases = oldAliases.includes(activeNote.title)
				? oldAliases
				: [...oldAliases, activeNote.title];

			// 3. Atualiza o frontmatter com o novo título e aliases
			const updatedContent = updateFrontmatterFields(content, {
				title: cleanTitle,
				aliases: newAliases,
			});

			// 4. Salva o novo arquivo
			const newPath = `notes/${cleanTitle}.md`;
			await writeFile(rootHandle, newPath, updatedContent);

			// 5. Exclui o arquivo antigo
			await deleteFile(rootHandle, activeFilePath);

			// 6. Re-indexa o vault
			const index = await reindexVault(rootHandle);
			useVaultStore.getState().setVaultData(index);
			queryClient.invalidateQueries({ queryKey: ["vaultIndex"] });
			queryClient.invalidateQueries({ queryKey: ["note", activeNote.id] });

			// 7. Navega para a nota (o ID permanece o mesmo!)
			navigate({ to: "/note/$id", params: { id: activeNote.id } });
		} catch (err) {
			alert(
				`Erro ao renomear nota: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	// Definição estática de comandos
	const baseCommands: CommandItem[] = [
		{
			icon: "◐",
			label: `Alternar tema (Tema atual: ${theme})`,
			action: () => setTheme(theme === "default" ? "dracula-soft" : "default"),
		},
		{
			icon: "▢",
			label: "Alternar barra lateral",
			keyHint: "⌘B",
			action: () => toggleSidebar(),
		},
		{
			icon: "▥",
			label: "Alternar painel direito",
			keyHint: "⌘J",
			action: () => togglePanel(),
		},
		{
			icon: "⛶",
			label: "Modo foco (esconder painéis)",
			keyHint: "⌘.",
			action: () => toggleFocusMode(),
		},
		{
			icon: "✕",
			label: "Fechar aba ativa",
			keyHint: "⌘W",
			action: () => {
				const { activeTabId, closeTab } = useUIStore.getState();
				if (activeTabId) closeTab(activeTabId);
			},
		},
		{
			icon: "📅",
			label: "Ir para Hoje",
			action: () => {
				const todayStr = getLocalDateString();
				navigate({ to: "/daily/$date", params: { date: todayStr } });
			},
		},
		{
			icon: "⌂",
			label: "Ver: Home",
			action: () => {
				navigate({ to: "/" });
			},
		},
		{
			icon: "📥",
			label: "Ver: Inbox",
			action: () => {
				navigate({ to: "/inbox" });
			},
		},
		{
			icon: "🗓️",
			label: "Ver: Semana",
			action: () => {
				navigate({ to: "/week" });
			},
		},
		{
			icon: "➕",
			label: "Nova nota livre",
			keyHint: "⌘N",
			action: () => openCreateModal("note"),
		},
		{
			icon: "◉",
			label: "Nova tarefa",
			action: () => openCreateModal("task"),
		},
	];

	if (activeFilePath?.startsWith("notes/")) {
		baseCommands.push({
			icon: "✏️",
			label: "Renomear nota ativa",
			action: handleRenameActiveNote,
		});
	}

	if (rootHandle) {
		baseCommands.push({
			icon: "🚪",
			label: "Fechar Vault",
			action: handleCloseVault,
		});
	}

	const noteCommands: CommandItem[] = notes.map((n) => {
		const isDaily = n.type === "daily";
		const isTask = n.type === "task";
		const dailyDate = isDaily ? dailyDateFromPath(n.path) : null;
		const icon = isDaily ? "📅" : isTask ? "◉" : "📄";
		const prefix = isDaily ? "Diário" : isTask ? "Task" : "Nota";
		return {
			icon,
			label:
				isDaily && dailyDate ? `Diário: ${dailyDate}` : `${prefix}: ${n.title}`,
			action: () => {
				if (isDaily && dailyDate) {
					navigate({ to: "/daily/$date", params: { date: dailyDate } });
				} else if (isTask) {
					navigate({ to: "/task/$id", params: { id: n.id } });
				} else {
					navigate({ to: "/note/$id", params: { id: n.id } });
				}
			},
		};
	});

	const allCommands = [...baseCommands, ...noteCommands];

	// Filtrar comandos
	const filteredCommands = allCommands.filter((cmd) =>
		cmd.label.toLowerCase().includes(query.toLowerCase()),
	);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			e.preventDefault();
			setIsOpen(false);
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((prev) =>
				filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0,
			);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((prev) =>
				filteredCommands.length > 0
					? (prev - 1 + filteredCommands.length) % filteredCommands.length
					: 0,
			);
		} else if (e.key === "Enter") {
			e.preventDefault();
			const selected = filteredCommands[selectedIndex];
			if (selected) {
				selected.action();
				setIsOpen(false);
			}
		}
	};

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === overlayRef.current) {
			setIsOpen(false);
		}
	};

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: overlay click is a backup mechanism, actual close is ESC
		// biome-ignore lint/a11y/noStaticElementInteractions: modal overlay container
		<div
			className="palette-overlay"
			ref={overlayRef}
			onClick={handleOverlayClick}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard event handler is linked globally and on input */}
			<div className="palette" onKeyDown={handleKeyDown}>
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setSelectedIndex(0);
					}}
					placeholder="Digite um comando..."
					autoComplete="off"
				/>
				{filteredCommands.length === 0 ? (
					<div className="empty">Nenhum comando encontrado</div>
				) : (
					<ul>
						{filteredCommands.map((cmd, index) => {
							const isSel = index === selectedIndex;
							return (
								// biome-ignore lint/a11y/useKeyWithClickEvents: enter key triggers selection
								<li
									key={cmd.label}
									className={isSel ? "sel" : ""}
									onClick={() => {
										cmd.action();
										setIsOpen(false);
									}}
								>
									<span className="pc">{cmd.icon}</span>
									<span>{cmd.label}</span>
									{cmd.keyHint && <span className="pk">{cmd.keyHint}</span>}
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
}
