// Frontmatter (YAML / Obsidian Properties).
//
// REGRA: gray-matter é usado APENAS para LER. Nunca `matter.stringify` — isso
// reordenaria chaves e sujaria o diff. A injeção lazy monta o bloco YAML à mão
// e só acontece na primeira escrita de um arquivo sem frontmatter; arquivo
// intacto nunca é tocado.

import matter from "gray-matter";
import { ulid } from "ulid";
import type { NoteType } from "@/types/vault";

// Campos autorais do frontmatter (o que o nó declara sobre si).
// Dado derivado (backlinks, índices) NUNCA entra aqui.
export interface FrontmatterFields {
	id?: string; // gerado (ULID) se ausente
	title: string;
	type: NoteType;
	tags?: string[];
	created: string; // YYYY-MM-DD
	aliases?: string[];
}

const FRONTMATTER_START = /^---\r?\n/;

/** Tem bloco de frontmatter logo no início? */
export function hasFrontmatter(raw: string): boolean {
	return FRONTMATTER_START.test(raw);
}

/** Lê frontmatter + corpo. Read-only — não modifica nem re-serializa. */
export function parseFrontmatter(raw: string): {
	data: Record<string, unknown>;
	body: string;
} {
	const parsed = matter(raw);
	return { data: parsed.data as Record<string, unknown>, body: parsed.content };
}

// Aspas só quando o valor pode quebrar o YAML inline.
const NEEDS_QUOTES = /[:#[\]{}",&*!|>'%@`]|^\s|\s$|^$/;

function yamlScalar(value: string): string {
	if (NEEDS_QUOTES.test(value)) {
		return `"${value.replace(/"/g, '\\"')}"`;
	}
	return value;
}

function yamlInlineArray(items: string[]): string {
	return `[${items.map(yamlScalar).join(", ")}]`;
}

/**
 * Monta o bloco de frontmatter à mão (ordem fixa: id, title, type, tags,
 * created, aliases). Gera `id` ULID se ausente. Retorna o bloco completo com
 * delimitadores e newline final. NÃO usa gray-matter.stringify.
 */
export function buildFrontmatterBlock(fields: FrontmatterFields): string {
	const lines = ["---"];
	lines.push(`id: ${fields.id ?? ulid()}`);
	lines.push(`title: ${yamlScalar(fields.title)}`);
	lines.push(`type: ${fields.type}`);
	if (fields.tags && fields.tags.length > 0) {
		lines.push(`tags: ${yamlInlineArray(fields.tags)}`);
	}
	lines.push(`created: ${fields.created}`);
	if (fields.aliases && fields.aliases.length > 0) {
		lines.push(`aliases: ${yamlInlineArray(fields.aliases)}`);
	}
	lines.push("---", "");
	return lines.join("\n");
}

/**
 * Injeção lazy: se o arquivo já tem frontmatter, devolve `raw` intacto (byte a
 * byte). Senão, prepend o bloco montado + linha em branco + corpo original.
 */
export function injectFrontmatterLazy(
	raw: string,
	fields: FrontmatterFields,
): string {
	if (hasFrontmatter(raw)) {
		return raw;
	}
	return `${buildFrontmatterBlock(fields)}\n${raw}`;
}

function coerceDate(value: unknown): string {
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	if (typeof value === "string") return value;
	return "";
}

/**
 * Altera campos específicos do frontmatter (como title, aliases, etc.) de um arquivo markdown
 * preservando o corpo original byte a byte e sem alterar chaves irrelevantes.
 */
export function updateFrontmatterFields(
	raw: string,
	updatedFields: Partial<FrontmatterFields>,
): string {
	const { data, body } = parseFrontmatter(raw);
	const fields: FrontmatterFields = {
		id: typeof data.id === "string" ? data.id : undefined,
		title: typeof data.title === "string" ? data.title : "",
		type: (typeof data.type === "string" ? data.type : "note") as NoteType,
		tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
		created: coerceDate(data.created),
		aliases: Array.isArray(data.aliases)
			? (data.aliases as string[])
			: undefined,
		...updatedFields,
	};
	return `${buildFrontmatterBlock(fields)}\n${body}`;
}
