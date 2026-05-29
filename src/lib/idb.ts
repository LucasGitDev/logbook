// Persistência do handle do vault em IndexedDB.
//
// O FileSystemDirectoryHandle precisa sobreviver a reloads para reabrir o mesmo
// vault sem novo picker. localStorage/sessionStorage são PROIBIDOS (não guardam
// handles e violam a convenção do projeto) — usamos IndexedDB.
// A permissão (requestPermission) ainda é re-pedida a cada sessão (ver vault.ts).

import { type IDBPDatabase, openDB } from "idb";

const DB_NAME = "diario-de-bordo";
// v3: força o upgrade idempotente a rodar e criar a store `preferences` em DBs
// que ficaram em v2 sem ela (sequela do boot script antigo que abria com versão
// fixa sem onupgradeneeded). O upgrade abaixo cria stores faltantes em qualquer
// versão anterior.
const DB_VERSION = 3;
const STORE = "handles";
const PREFS_STORE = "preferences";
const VAULT_KEY = "vault-root";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			upgrade(db) {
				if (!db.objectStoreNames.contains(STORE)) {
					db.createObjectStore(STORE);
				}
				if (!db.objectStoreNames.contains(PREFS_STORE)) {
					db.createObjectStore(PREFS_STORE);
				}
			},
		});
	}
	return dbPromise;
}

/** Salva o handle do vault para reabrir entre sessões. */
export async function saveVaultHandle(
	handle: FileSystemDirectoryHandle,
): Promise<void> {
	const db = await getDb();
	await db.put(STORE, handle, VAULT_KEY);
}

/** Recupera o handle persistido, ou null se nunca foi escolhido. */
export async function loadVaultHandle(): Promise<FileSystemDirectoryHandle | null> {
	const db = await getDb();
	const handle = await db.get(STORE, VAULT_KEY);
	return (handle as FileSystemDirectoryHandle | undefined) ?? null;
}

/** Esquece o vault (ex: trocar de pasta). */
export async function clearVaultHandle(): Promise<void> {
	const db = await getDb();
	await db.delete(STORE, VAULT_KEY);
}

/** Salva uma preferência de UI no IndexedDB. */
export async function savePreference(
	key: string,
	value: unknown,
): Promise<void> {
	const db = await getDb();
	await db.put(PREFS_STORE, value, key);
}

/** Recupera uma preferência de UI do IndexedDB. */
export async function loadPreference<T>(
	key: string,
	defaultValue: T,
): Promise<T> {
	try {
		const db = await getDb();
		const val = await db.get(PREFS_STORE, key);
		return val !== undefined ? (val as T) : defaultValue;
	} catch (err) {
		console.warn(`Erro ao carregar preferência ${key}:`, err);
		return defaultValue;
	}
}
