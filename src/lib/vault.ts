// File System Access — ÚNICO lugar que toca a API FileSystem* do navegador.
// O resto do app fala com o vault só por estas funções (caminhos relativos +
// string de conteúdo). Chrome/Edge only.

import type { VaultMeta } from "@/types/vault";
import { loadVaultHandle, saveVaultHandle } from "./idb";

const SCHEMA_VERSION = 1;

// ─── Suporte / picker / permissão ─────────────────────────────────────────────

/** A API existe neste navegador? (Firefox/Safari não implementam.) */
export function isFileSystemAccessSupported(): boolean {
	return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/** Abre o seletor de diretório (read/write). */
export async function pickVaultDirectory(): Promise<FileSystemDirectoryHandle> {
	return window.showDirectoryPicker({ mode: "readwrite" });
}

/** Garante permissão: consulta e, se preciso, pede. */
export async function verifyPermission(
	handle: FileSystemHandle,
	write = true,
): Promise<boolean> {
	const opts: FileSystemHandlePermissionDescriptor = {
		mode: write ? "readwrite" : "read",
	};
	if ((await handle.queryPermission(opts)) === "granted") return true;
	return (await handle.requestPermission(opts)) === "granted";
}

// ─── Caminhos ──────────────────────────────────────────────────────────────────

/** Caminho relativo da nota do dia. */
export function dailyNotePath(date: string): string {
	return `daily/${date}/notes.md`;
}

/** Caminho relativo de uma nota livre pelo nome. */
export function notePath(name: string): string {
	return `notes/${name}.md`;
}

// ─── Travessia de diretórios ─────────────────────────────────────────────────

async function resolveParent(
	root: FileSystemDirectoryHandle,
	relPath: string,
	create: boolean,
): Promise<{ dir: FileSystemDirectoryHandle; fileName: string }> {
	const parts = relPath.split("/").filter(Boolean);
	const fileName = parts.pop();
	if (!fileName) throw new Error(`caminho inválido: ${relPath}`);
	let dir = root;
	for (const part of parts) {
		dir = await dir.getDirectoryHandle(part, { create });
	}
	return { dir, fileName };
}

// ─── Leitura / escrita de arquivos ─────────────────────────────────────────────

/** Lê um arquivo texto; null se não existir. */
export async function readFile(
	root: FileSystemDirectoryHandle,
	relPath: string,
): Promise<string | null> {
	try {
		const { dir, fileName } = await resolveParent(root, relPath, false);
		const fileHandle = await dir.getFileHandle(fileName);
		const file = await fileHandle.getFile();
		return await file.text();
	} catch (err) {
		if (
			err &&
			typeof err === "object" &&
			"name" in err &&
			err.name === "NotFoundError"
		)
			return null;
		throw err;
	}
}

/** Escreve um arquivo texto, criando diretórios pais se necessário. */
export async function writeFile(
	root: FileSystemDirectoryHandle,
	relPath: string,
	content: string,
): Promise<void> {
	const { dir, fileName } = await resolveParent(root, relPath, true);
	const fileHandle = await dir.getFileHandle(fileName, { create: true });
	const writable = await fileHandle.createWritable();
	await writable.write(content);
	await writable.close();
}

/** Existe esse arquivo? */
export async function fileExists(
	root: FileSystemDirectoryHandle,
	relPath: string,
): Promise<boolean> {
	try {
		const { dir, fileName } = await resolveParent(root, relPath, false);
		await dir.getFileHandle(fileName);
		return true;
	} catch {
		return false;
	}
}

// ─── JSON (meta/*) ──────────────────────────────────────────────────────────────

export async function readJson<T>(
	root: FileSystemDirectoryHandle,
	relPath: string,
): Promise<T | null> {
	try {
		const raw = await readFile(root, relPath);
		if (raw === null || raw.trim() === "") return null;
		return JSON.parse(raw) as T;
	} catch (err) {
		console.warn(`Erro ao ler ou parsear JSON em ${relPath}:`, err);
		return null;
	}
}

/** Serializa JSON com indentação (diff git-friendly) e escreve. */
export async function writeJson(
	root: FileSystemDirectoryHandle,
	relPath: string,
	data: unknown,
): Promise<void> {
	await writeFile(root, relPath, `${JSON.stringify(data, null, 2)}\n`);
}

// ─── Listagem de nós ────────────────────────────────────────────────────────────

async function* walkMarkdown(
	dir: FileSystemDirectoryHandle,
	prefix: string,
): AsyncGenerator<string> {
	for await (const [name, handle] of dir.entries()) {
		const rel = `${prefix}/${name}`;
		if (handle.kind === "directory") {
			yield* walkMarkdown(handle as FileSystemDirectoryHandle, rel);
		} else if (name.endsWith(".md")) {
			yield rel;
		}
	}
}

async function listUnder(
	root: FileSystemDirectoryHandle,
	subdir: string,
): Promise<string[]> {
	let dir: FileSystemDirectoryHandle;
	try {
		dir = await root.getDirectoryHandle(subdir);
	} catch {
		return []; // subdir ainda não existe
	}
	const out: string[] = [];
	for await (const rel of walkMarkdown(dir, subdir)) out.push(rel);
	return out;
}

/** Todos os `.md` sob `daily/` e `notes/` (caminhos relativos ao vault). */
export async function listNoteFiles(
	root: FileSystemDirectoryHandle,
): Promise<string[]> {
	const [daily, notes] = await Promise.all([
		listUnder(root, "daily"),
		listUnder(root, "notes"),
	]);
	return [...daily, ...notes];
}

// ─── Bootstrap ──────────────────────────────────────────────────────────────────

/** Cria meta/, daily/, notes/ e .vault.json se faltarem. Idempotente. */
export async function bootstrapVault(
	root: FileSystemDirectoryHandle,
): Promise<void> {
	await Promise.all([
		root.getDirectoryHandle("meta", { create: true }),
		root.getDirectoryHandle("daily", { create: true }),
		root.getDirectoryHandle("notes", { create: true }),
	]);
	if (!(await fileExists(root, ".vault.json"))) {
		const meta: VaultMeta = {
			schemaVersion: SCHEMA_VERSION,
			lastOpened: new Date().toISOString(),
		};
		await writeJson(root, ".vault.json", meta);
	}
}

/** Cria `daily/YYYY-MM-DD/notes.md` vazio se faltar. Retorna o caminho. */
export async function ensureDailyNote(
	root: FileSystemDirectoryHandle,
	date: string,
): Promise<string> {
	const path = dailyNotePath(date);
	if (!(await fileExists(root, path))) {
		await writeFile(root, path, "");
	}
	return path;
}

// ─── Orquestração de abertura ────────────────────────────────────────────────

/** Picker → permissão → persiste handle → bootstrap. Null se permissão negada. */
export async function openVault(): Promise<FileSystemDirectoryHandle | null> {
	const handle = await pickVaultDirectory();
	if (!(await verifyPermission(handle))) return null;
	await saveVaultHandle(handle);
	await bootstrapVault(handle);
	return handle;
}

/** Reabre o vault salvo, re-pedindo permissão. Null se nenhum ou negado. */
export async function restoreVault(): Promise<FileSystemDirectoryHandle | null> {
	const handle = await loadVaultHandle();
	if (!handle) return null;
	if (!(await verifyPermission(handle))) return null;
	await bootstrapVault(handle);
	return handle;
}
