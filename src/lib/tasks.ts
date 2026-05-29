// Helpers puros de agregação/filtro de tasks. Sem I/O, testáveis.
// O índice global (store.tasks) é derivado dos .md; aqui só fatiamos.

import type { Task } from "@/types/vault";

/** Filtra por projeto (#tag). `null` = sem filtro (devolve tudo). */
export function filterTasksByProject(
	tasks: Task[],
	project: string | null,
): Task[] {
	if (!project) return tasks;
	return tasks.filter((t) => t.project === project);
}

export interface InboxGroups {
	overdue: Task[]; // agendadas antes de hoje
	today: Task[]; // agendadas pra hoje
	upcoming: Task[]; // agendadas pra depois
	noDate: Task[]; // sem 📅
}

/**
 * Agrupa as tasks ABERTAS por relação da `scheduledDate` com `today`
 * (YYYY-MM-DD). Tasks feitas são ignoradas. Dentro de cada grupo datado,
 * ordena por data crescente; `noDate` mantém ordem de origem.
 */
export function groupInboxTasks(tasks: Task[], today: string): InboxGroups {
	const groups: InboxGroups = {
		overdue: [],
		today: [],
		upcoming: [],
		noDate: [],
	};
	for (const t of tasks) {
		if (t.status !== "open") continue;
		if (!t.scheduledDate) {
			groups.noDate.push(t);
		} else if (t.scheduledDate < today) {
			groups.overdue.push(t);
		} else if (t.scheduledDate === today) {
			groups.today.push(t);
		} else {
			groups.upcoming.push(t);
		}
	}
	const byDate = (a: Task, b: Task) =>
		(a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? "");
	groups.overdue.sort(byDate);
	groups.upcoming.sort(byDate);
	return groups;
}
