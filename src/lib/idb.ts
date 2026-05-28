// Persistência do handle do vault em IndexedDB.
//
// O FileSystemDirectoryHandle precisa sobreviver a reloads para reabrir o mesmo
// vault sem novo picker. localStorage/sessionStorage são PROIBIDOS (não guardam
// handles e violam a convenção do projeto) — usamos IndexedDB.
// A permissão (requestPermission) ainda é re-pedida a cada sessão (ver vault.ts).

import { type IDBPDatabase, openDB } from "idb";

const DB_NAME = "diario-de-bordo";
const DB_VERSION = 1;
const STORE = "handles";
const VAULT_KEY = "vault-root";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			upgrade(db) {
				if (!db.objectStoreNames.contains(STORE)) {
					db.createObjectStore(STORE);
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
