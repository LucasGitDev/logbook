// Git informativo — detecção mínima de repositório, sem rodar git no browser.
// O vault pode ser um repo git separado; aqui só lemos .git/HEAD pra mostrar a
// branch no Statusbar. Ações reais (commit/push) acontecem no terminal do usuário.

import { readFile } from "./vault";

const HEAD_REF_RE = /^ref:\s*refs\/heads\/(.+)$/;

/** Extrai a branch de um conteúdo de `.git/HEAD`. Puro/testável. */
export function parseGitHead(head: string): { branch?: string } {
	const line = head.trim();
	if (!line) return {};
	const ref = HEAD_REF_RE.exec(line);
	if (ref?.[1]) return { branch: ref[1] };
	// HEAD destacado: conteúdo é um hash de commit → mostra o short hash.
	if (/^[0-9a-f]{7,40}$/i.test(line)) return { branch: line.slice(0, 7) };
	return {};
}

export interface GitStatus {
	isRepo: boolean;
	branch?: string;
}

/** O vault é um repo git? Em caso afirmativo, qual a branch atual (de .git/HEAD)? */
export async function readGitStatus(
	root: FileSystemDirectoryHandle,
): Promise<GitStatus> {
	try {
		await root.getDirectoryHandle(".git");
	} catch {
		return { isRepo: false };
	}
	const head = await readFile(root, ".git/HEAD");
	if (head === null) return { isRepo: true };
	return { isRepo: true, ...parseGitHead(head) };
}
