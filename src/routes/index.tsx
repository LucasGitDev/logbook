import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	FolderOpen,
	MonitorX,
	RefreshCw,
	Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getLocalDateString } from "@/lib/dates";
import { loadVaultHandle } from "@/lib/idb.ts";
import {
	isFileSystemAccessSupported,
	openVault,
	restoreVault,
} from "@/lib/vault";
import { useVaultStore } from "@/stores/vaultStore";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	const navigate = useNavigate();
	const { isLoaded, setRootHandle } = useVaultStore();

	const [recentHandle, setRecentHandle] =
		useState<FileSystemDirectoryHandle | null>(null);
	const [isCheckingRecent, setIsCheckingRecent] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// Redireciona para o dia atual se o vault já estiver carregado
	useEffect(() => {
		if (isLoaded) {
			const todayStr = getLocalDateString();
			navigate({ to: "/daily/$date", params: { date: todayStr } });
		}
	}, [isLoaded, navigate]);

	// Verifica se existe um vault recente persistido no IndexedDB
	useEffect(() => {
		loadVaultHandle()
			.then((handle) => {
				setRecentHandle(handle);
			})
			.catch((err) => {
				console.error("Erro ao verificar vault recente:", err);
			})
			.finally(() => {
				setIsCheckingRecent(false);
			});
	}, []);

	const handleOpenNewVault = async () => {
		setError(null);
		setIsLoading(true);
		try {
			const handle = await openVault();
			if (handle) {
				setRootHandle(handle);
			} else {
				setError(
					"Permissão de leitura/escrita negada ou cancelada pelo usuário.",
				);
			}
		} catch (err) {
			console.error(err);
			setError(
				"Ocorreu um erro ao abrir a pasta. Certifique-se de usar um navegador compatível (Chrome/Edge).",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleOpenRecentVault = async () => {
		if (!recentHandle) return;
		setError(null);
		setIsLoading(true);
		try {
			// Passa o handle já pré-carregado (mount) — NÃO ler IndexedDB aqui:
			// requestPermission precisa de transient activation do clique, e um
			// await de I/O antes dele pode gastar a janela (prompt some no Arc).
			const handle = await restoreVault(recentHandle);
			if (handle) {
				setRootHandle(handle);
			} else {
				setError("Permissão para reabrir a pasta recente foi negada.");
			}
		} catch (err) {
			console.error(err);
			setError(
				"Erro ao reabrir a pasta recente. Tente selecionar o diretório novamente.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	// Navegador sem File System Access (Firefox/Safari/mobile): degrada com aviso.
	if (!isFileSystemAccessSupported()) {
		return (
			<div className="min-h-screen w-screen bg-bg text-fg flex flex-col items-center justify-center p-6 select-none">
				<div className="w-full max-w-md p-8 bg-bg-elev border border-line rounded-xl flex flex-col items-center text-center">
					<div className="h-14 w-14 rounded-2xl bg-warn/15 flex items-center justify-center mb-6">
						<MonitorX className="h-7 w-7 text-warn" />
					</div>
					<h1 className="text-xl font-bold text-fg-strong tracking-wide mb-2">
						Navegador não compatível
					</h1>
					<p className="text-sm text-fg-4 leading-relaxed">
						O Diário de Bordo lê e escreve arquivos locais via{" "}
						<strong>File System Access API</strong>, que não está disponível
						neste navegador/dispositivo. Abra no{" "}
						<strong>Chrome, Edge ou Opera no desktop</strong>.
					</p>
				</div>
				<footer className="mt-8 text-[11px] text-fg-5 font-mono">
					Local-first architecture
				</footer>
			</div>
		);
	}

	if (isCheckingRecent) {
		return (
			<div className="min-h-screen w-screen flex flex-col items-center justify-center bg-bg text-fg select-none">
				<RefreshCw className="h-8 w-8 text-accent animate-spin" />
				<p className="text-sm text-fg-4 font-medium mt-3 font-mono">
					Verificando sessões anteriores...
				</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen w-screen bg-bg text-fg flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
			{/* Main welcome Card (Flat, no-glass) */}
			<div className="w-full max-w-md p-8 bg-bg-elev border border-line rounded-xl flex flex-col items-center text-center">
				<div className="h-14 w-14 rounded-2xl bg-accent flex items-center justify-center mb-6">
					<Sparkles className="h-7 w-7 text-white" />
				</div>

				<h1 className="text-2xl font-bold text-fg-strong tracking-wide mb-2">
					Diário de Bordo
				</h1>

				<p className="text-sm text-fg-4 leading-relaxed mb-8 max-w-sm">
					Organize seu dia, planeje tarefas e registre compromissos em arquivos
					markdown locais de forma 100% privativa e sem servidores.
				</p>

				{error && (
					<div className="w-full p-3.5 mb-6 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs font-medium text-left font-mono">
						{error}
					</div>
				)}

				<div className="w-full flex flex-col gap-3">
					{recentHandle ? (
						<>
							<button
								type="button"
								onClick={handleOpenRecentVault}
								disabled={isLoading}
								className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-accent hover:bg-accent-strong text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
							>
								{isLoading ? (
									<RefreshCw className="h-4 w-4 animate-spin" />
								) : (
									<>
										Reabrir Vault Recente
										<ArrowRight className="h-4 w-4" />
									</>
								)}
							</button>

							<div className="text-[10px] text-fg-5 font-mono truncate max-w-full px-2">
								{recentHandle.name}
							</div>

							<button
								type="button"
								onClick={handleOpenNewVault}
								disabled={isLoading}
								className="w-full py-2.5 px-4 bg-surface hover:bg-surface-hover border border-line-soft text-fg-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
							>
								Selecionar Outra Pasta
							</button>
						</>
					) : (
						<button
							type="button"
							onClick={handleOpenNewVault}
							disabled={isLoading}
							className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 bg-accent hover:bg-accent-strong text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
						>
							{isLoading ? (
								<RefreshCw className="h-4 w-4 animate-spin" />
							) : (
								<>
									<FolderOpen className="h-4.5 w-4.5" />
									Abrir Diretório (Vault)
								</>
							)}
						</button>
					)}
				</div>
			</div>

			<footer className="mt-8 text-[11px] text-fg-5 flex items-center gap-2 font-mono">
				<span>Compatível com Chrome, Edge e Opera</span>
				<span>•</span>
				<span>Local-first architecture</span>
			</footer>
		</div>
	);
}
