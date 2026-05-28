import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, FolderOpen, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getLocalDateString } from "@/lib/dates";
import { loadVaultHandle } from "@/lib/idb.ts";
import { openVault, restoreVault } from "@/lib/vault";
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
		setError(null);
		setIsLoading(true);
		try {
			const handle = await restoreVault();
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

	if (isCheckingRecent) {
		return (
			<div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-gray-200">
				<RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
				<p className="text-sm text-gray-400 font-medium mt-3">
					Verificando sessões anteriores...
				</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen w-screen bg-[#0a0a0c] text-gray-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
			{/* Efeitos decorativos de fundo */}
			<div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
			<div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

			{/* Main welcome Card */}
			<div className="w-full max-w-md p-8 glass-panel border-[rgba(255,255,255,0.06)] relative z-10 flex flex-col items-center text-center shadow-2xl">
				<div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6 animate-pulse">
					<Sparkles className="h-7 w-7 text-white" />
				</div>

				<h1 className="text-2xl font-bold text-white tracking-wide mb-2">
					Diário de Bordo
				</h1>

				<p className="text-sm text-gray-400 leading-relaxed mb-8 max-w-sm">
					Organize seu dia, planeje tarefas e registre compromissos em arquivos
					markdown locais de forma 100% privativa e sem servidores.
				</p>

				{error && (
					<div className="w-full p-3.5 mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-left">
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
								className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
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

							<div className="text-[10px] text-gray-500 font-mono truncate max-w-full px-2">
								{recentHandle.name}
							</div>

							<button
								type="button"
								onClick={handleOpenNewVault}
								disabled={isLoading}
								className="w-full py-2.5 px-4 bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-gray-300 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
							>
								Selecionar Outra Pasta
							</button>
						</>
					) : (
						<button
							type="button"
							onClick={handleOpenNewVault}
							disabled={isLoading}
							className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
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

			<footer className="mt-8 text-[11px] text-gray-600 flex items-center gap-2 relative z-10">
				<span>Compatível com Chrome, Edge e Opera</span>
				<span>•</span>
				<span>Local-first architecture</span>
			</footer>
		</div>
	);
}
