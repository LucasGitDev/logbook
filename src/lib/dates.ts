/** Retorna a data no fuso horário local no formato YYYY-MM-DD */
export function getLocalDateString(d: Date = new Date()): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/** Converte "YYYY-MM-DD" em Date local (meia-noite, sem fuso UTC). */
function parseLocalDate(dateStr: string): Date {
	const [y, m, d] = dateStr.split("-").map(Number);
	return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Soma `n` dias a uma data YYYY-MM-DD (n pode ser negativo). Puro, sem fuso. */
export function addDays(dateStr: string, n: number): string {
	const d = parseLocalDate(dateStr);
	d.setDate(d.getDate() + n);
	return getLocalDateString(d);
}
