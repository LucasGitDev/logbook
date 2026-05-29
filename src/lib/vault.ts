// File System Access — ÚNICO lugar que toca a API FileSystem* do navegador.
// O resto do app fala com o vault só por estas funções (caminhos relativos +
// string de conteúdo). Chrome/Edge only.

import type { VaultMeta, VaultSettings } from "@/types/vault";
import { saveVaultHandle } from "./idb";

const SCHEMA_VERSION = 1;

const SETTINGS_PATH = "meta/settings.json";
const DEFAULT_SETTINGS: VaultSettings = { theme: "default" };

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

/** Exclui um arquivo do diretório. */
export async function deleteFile(
	root: FileSystemDirectoryHandle,
	relPath: string,
): Promise<void> {
	const { dir, fileName } = await resolveParent(root, relPath, false);
	await dir.removeEntry(fileName);
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

// ─── Settings (preferências persistidas no vault) ─────────────────────────────

/** Lê meta/settings.json; faz merge com os defaults (campos faltantes/arquivo ausente). */
export async function readSettings(
	root: FileSystemDirectoryHandle,
): Promise<VaultSettings> {
	const stored = await readJson<Partial<VaultSettings>>(root, SETTINGS_PATH);
	return { ...DEFAULT_SETTINGS, ...stored };
}

/** Escreve meta/settings.json. */
export async function writeSettings(
	root: FileSystemDirectoryHandle,
	settings: VaultSettings,
): Promise<void> {
	await writeJson(root, SETTINGS_PATH, settings);
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
	if (!(await fileExists(root, SETTINGS_PATH))) {
		await writeJson(root, SETTINGS_PATH, DEFAULT_SETTINGS);
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

/**
 * Reabre um vault a partir de um handle JÁ carregado (do IndexedDB, no mount).
 *
 * IMPORTANTE: recebe o handle por parâmetro de propósito. `requestPermission`
 * exige *transient user activation* (clique recente) e a janela de ativação é
 * curta — ler o IndexedDB aqui (await) gastaria essa janela e o prompt poderia
 * não aparecer (sintoma observado no Arc). Então o caller passa o handle
 * pré-carregado e chamamos `verifyPermission` como primeiro await, antes de
 * qualquer bootstrap/I/O. Null se permissão negada.
 */
export async function restoreVault(
	handle: FileSystemDirectoryHandle,
): Promise<FileSystemDirectoryHandle | null> {
	if (!(await verifyPermission(handle))) return null;
	await bootstrapVault(handle);
	return handle;
}
