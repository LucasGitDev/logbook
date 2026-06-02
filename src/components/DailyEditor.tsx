import {
	autocompletion,
	type Completion,
	type CompletionContext,
	type CompletionResult,
	completionKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import {
	defaultHighlightStyle,
	indentOnInput,
	syntaxHighlighting,
	syntaxTree,
} from "@codemirror/language";
import {
	EditorState,
	type Range,
	StateEffect,
	StateField,
} from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	drawSelection,
	EditorView,
	keymap,
	tooltips,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { useCallback, useEffect, useRef } from "react";
import { addDays, getLocalDateString } from "@/lib/dates";
import { dailyDateFromPath } from "@/lib/indexer";
import { createNote } from "@/lib/notes";
import { createTaskNode } from "@/lib/taskNode";
import { useSaveNote } from "@/lib/useVault";
import { useVaultStore } from "@/stores/vaultStore";

// --- Custom Widget to Render Chips ---
class ChipWidget extends WidgetType {
	readonly text: string;
	readonly type: string;

	constructor(text: string, type: string) {
		super();
		this.text = text;
		this.type = type;
	}

	override eq(other: ChipWidget) {
		return other.text === this.text && other.type === this.type;
	}

	override toDOM() {
		const span = document.createElement("span");
		span.className = `cm-chip cm-chip-${this.type}`;

		let cleanText = this.text;
		if (this.type === "date") {
			cleanText = this.text.replace(/📅\s*/, "");
			span.innerHTML = `<span class="cm-chip-icon">📅</span> ${cleanText}`;
		} else if (this.type === "agenda") {
			cleanText = this.text.replace(/🗓️\s*/, "");
			span.innerHTML = `<span class="cm-chip-icon">🗓️</span> ${cleanText}`;
		} else if (this.type === "time") {
			cleanText = this.text.replace(/⏰\s*/, "");
			span.innerHTML = `<span class="cm-chip-icon">⏰</span> ${cleanText}`;
		} else if (this.type === "duration") {
			cleanText = this.text.replace(/⏱️\s*/, "");
			span.innerHTML = `<span class="cm-chip-icon">⏱️</span> ${cleanText}`;
		} else if (this.type === "project") {
			cleanText = this.text.replace(/#/, "");
			span.innerHTML = `<span class="cm-chip-icon">#</span>${cleanText}`;
		} else if (this.type === "link") {
			cleanText = this.text.replace(/^\[\[/, "").replace(/\]\]$/, "");
			// Guarda o nome limpo num data-attr: o innerText inclui o ícone 🔗 e
			// quebraria a resolução do link no clique.
			span.dataset.link = cleanText;
			span.innerHTML = `<span class="cm-chip-icon">🔗</span> ${cleanText}`;
		} else {
			span.textContent = this.text;
		}

		return span;
	}

	override ignoreEvent() {
		return false;
	}
}

// --- Extensões de Decoração (Chips & Concluídos) ---
const doneLineDecoration = Decoration.line({ class: "cm-checkbox-done-line" });

const DATE_RE = /📅\s*\d{4}-\d{2}-\d{2}/g;
const AGENDA_RE = /🗓️\s*\d{4}-\d{2}-\d{2}/g;
const TIME_RE = /⏰\s*\d{1,2}:\d{2}/g;
const DURATION_RE = /⏱️\s*\d+\s*min/g;
const PROJECT_RE = /#[\p{L}\d_-]+/gu;
const LINK_RE = /\[\[([^\]]+)\]\]/g;

const chipPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}
		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged || update.selectionSet) {
				this.decorations = this.buildDecorations(update.view);
			}
		}
		buildDecorations(view: EditorView) {
			const builder: Range<Decoration>[] = [];
			const selection = view.state.selection;

			// Helper para verificar se a seleção intercepta o range
			const isCursorInside = (start: number, end: number) => {
				return selection.ranges.some((range) => {
					return range.from <= end && range.to >= start;
				});
			};

			for (const { from, to } of view.visibleRanges) {
				const text = view.state.doc.sliceString(from, to);

				// 1. Linhas concluídas (- [x])
				const startLine = view.state.doc.lineAt(from).number;
				const endLine = view.state.doc.lineAt(to).number;
				for (let l = startLine; l <= endLine; l++) {
					const line = view.state.doc.line(l);
					if (/^\s*- \[[xX]\]/.test(line.text)) {
						builder.push(doneLineDecoration.range(line.from, line.from));
					}
				}

				// 2. Chips Inline
				const matches: { from: number; to: number; deco: Decoration }[] = [];
				const findMatches = (re: RegExp, type: string) => {
					re.lastIndex = 0;
					let m: RegExpExecArray | null;
					while (true) {
						m = re.exec(text);
						if (!m) break;
						const start = from + m.index;
						const end = start + m[0].length;

						if (isCursorInside(start, end)) {
							// Se o cursor estiver dentro, mostramos o texto com marcação CSS suave
							matches.push({
								from: start,
								to: end,
								deco: Decoration.mark({
									class: `cm-chip-editing cm-chip-${type}`,
								}),
							});
						} else {
							// Se não, ocultamos o texto cru e exibimos o badge/widget de verdade
							matches.push({
								from: start,
								to: end,
								deco: Decoration.replace({
									widget: new ChipWidget(m[0], type),
								}),
							});
						}
					}
				};

				findMatches(DATE_RE, "date");
				findMatches(AGENDA_RE, "agenda");
				findMatches(TIME_RE, "time");
				findMatches(DURATION_RE, "duration");
				findMatches(PROJECT_RE, "project");
				findMatches(LINK_RE, "link");

				// Ordena por posição de início
				matches.sort((a, b) => a.from - b.from);

				for (const m of matches) {
					builder.push(m.deco.range(m.from, m.to));
				}
			}
			return Decoration.set(builder, true);
		}
	},
	{
		decorations: (v) => v.decorations,
	},
);

class HRWidget extends WidgetType {
	override toDOM() {
		const hr = document.createElement("hr");
		hr.className = "cm-hr";
		return hr;
	}
}

const livePreviewPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}
		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged || update.selectionSet) {
				this.decorations = this.buildDecorations(update.view);
			}
		}
		buildDecorations(view: EditorView) {
			const builder: Range<Decoration>[] = [];
			const selection = view.state.selection;
			const activeLines = new Set<number>();
			for (const range of selection.ranges) {
				try {
					const line = view.state.doc.lineAt(range.head).number;
					activeLines.add(line);
				} catch {
					// fallback
				}
			}

			const tree = syntaxTree(view.state);

			for (const { from, to } of view.visibleRanges) {
				tree.iterate({
					from,
					to,
					enter(node) {
						let lineStart = 1;
						let lineEnd = 1;
						try {
							lineStart = view.state.doc.lineAt(node.from).number;
							lineEnd = view.state.doc.lineAt(node.to).number;
						} catch {
							return;
						}
						const isCursorOnLine = Array.from(activeLines).some(
							(line) => line >= lineStart && line <= lineEnd,
						);

						const type = node.name;

						// --- Heading Styles ---
						if (type.startsWith("ATXHeading")) {
							const level = parseInt(type.slice(10), 10);
							if (!Number.isNaN(level)) {
								try {
									const startLinePos = view.state.doc.line(lineStart).from;
									builder.push(
										Decoration.line({
											class: `cm-heading cm-h${level}`,
										}).range(startLinePos, startLinePos),
									);
								} catch {
									// ignore
								}
							}
						}

						// --- Strong and Emphasis Styles ---
						if (type === "StrongEmphasis" && node.from < node.to) {
							builder.push(
								Decoration.mark({ class: "cm-bold" }).range(node.from, node.to),
							);
						}
						if (type === "Emphasis" && node.from < node.to) {
							builder.push(
								Decoration.mark({ class: "cm-italic" }).range(
									node.from,
									node.to,
								),
							);
						}

						// --- Inline Code Style ---
						if (type === "InlineCode" && node.from < node.to) {
							builder.push(
								Decoration.mark({ class: "cm-inline-code" }).range(
									node.from,
									node.to,
								),
							);
						}

						// --- Blockquote Style ---
						if (type === "BlockQuote") {
							try {
								for (let l = lineStart; l <= lineEnd; l++) {
									const startLinePos = view.state.doc.line(l).from;
									builder.push(
										Decoration.line({
											class: "cm-blockquote",
										}).range(startLinePos, startLinePos),
									);
								}
							} catch {
								// ignore
							}
						}

						// Se o cursor estiver na linha deste nó, mostramos o markdown cru (revelação ao cursor)
						if (isCursorOnLine) return;

						// --- Hiding HeaderMark (#, ##...) ---
						if (type === "HeaderMark" && node.from < node.to) {
							builder.push(Decoration.replace({}).range(node.from, node.to));
						}

						// --- Hiding EmphasisMark (*, **, _, __) ---
						if (type === "EmphasisMark" && node.from < node.to) {
							builder.push(Decoration.replace({}).range(node.from, node.to));
						}

						// --- Hiding CodeMark (`) ---
						if (type === "CodeMark" && node.from < node.to) {
							builder.push(Decoration.replace({}).range(node.from, node.to));
						}

						// --- Hiding QuoteMark (>) ---
						if (type === "QuoteMark" && node.from < node.to) {
							builder.push(Decoration.replace({}).range(node.from, node.to));
						}

						// HorizontalRule (---) é tratado pelo hrField (StateField),
						// porque decorações de bloco não podem vir de ViewPlugin.
					},
				});
			}

			// Ordena por posição de início
			builder.sort((a, b) => a.from - b.from);
			return Decoration.set(builder, true);
		}
	},
	{
		decorations: (v) => v.decorations,
	},
);

// Range do bloco de frontmatter (--- ... ---) no topo do doc, ou null.
// `to` é o fim da linha do --- de fechamento. Mesma ideia de
// calculateFrontmatterLines (indexer.ts), mas em cima do doc do CodeMirror.
function frontmatterRange(
	state: EditorState,
): { from: number; to: number } | null {
	const doc = state.doc;
	if (doc.lines < 2 || doc.line(1).text !== "---") return null;
	for (let l = 2; l <= doc.lines; l++) {
		if (doc.line(l).text === "---") {
			return { from: 0, to: doc.line(l).to };
		}
	}
	return null;
}

// Decorações de BLOCO (---) precisam vir de um StateField, não de um ViewPlugin
// (CodeMirror: "Block decorations may not be specified via plugins").
function buildHrDecorations(state: EditorState): DecorationSet {
	const builder: Range<Decoration>[] = [];
	const activeLines = new Set<number>();
	for (const range of state.selection.ranges) {
		activeLines.add(state.doc.lineAt(range.head).number);
	}
	// Os --- do frontmatter não são HR: ficam a cargo do frontmatterFold.
	const fm = frontmatterRange(state);
	syntaxTree(state).iterate({
		enter(node) {
			if (node.name === "HorizontalRule" && node.from < node.to) {
				if (fm && node.from <= fm.to) return;
				const ln = state.doc.lineAt(node.from).number;
				// Cursor na linha → revela o markdown cru (---)
				if (activeLines.has(ln)) return;
				builder.push(
					Decoration.replace({ widget: new HRWidget(), block: true }).range(
						node.from,
						node.to,
					),
				);
			}
		},
	});
	return Decoration.set(builder, true);
}

const hrField = StateField.define<DecorationSet>({
	create: (state) => buildHrDecorations(state),
	update(deco, tr) {
		if (tr.docChanged || tr.selection) return buildHrDecorations(tr.state);
		return deco.map(tr.changes);
	},
	provide: (f) => EditorView.decorations.from(f),
});

// --- Frontmatter colapsável ---
// O bloco YAML (id/title/type/...) fica oculto por padrão atrás de uma barra
// "Propriedades"; clicar expande/recolhe. O texto permanece no doc byte a byte
// (só decoração visual) — zero impacto em save/parse.
const toggleFrontmatter = StateEffect.define<boolean>();

const frontmatterCollapsed = StateField.define<boolean>({
	create: () => true, // colapsado por padrão
	update(value, tr) {
		for (const e of tr.effects) if (e.is(toggleFrontmatter)) return e.value;
		return value;
	},
});

class FrontmatterBarWidget extends WidgetType {
	readonly collapsed: boolean;
	constructor(collapsed: boolean) {
		super();
		this.collapsed = collapsed;
	}
	override eq(other: FrontmatterBarWidget) {
		return other.collapsed === this.collapsed;
	}
	override toDOM(view: EditorView) {
		const el = document.createElement("div");
		el.className = "cm-frontmatter-bar";
		el.innerHTML = `<span class="cm-fm-arrow">${this.collapsed ? "▸" : "▾"}</span> Propriedades`;
		// mousedown preventDefault: não rouba a seleção/cursor do editor.
		el.addEventListener("mousedown", (e) => e.preventDefault());
		el.addEventListener("click", (e) => {
			e.preventDefault();
			view.dispatch({ effects: toggleFrontmatter.of(!this.collapsed) });
		});
		return el;
	}
	override ignoreEvent() {
		return false;
	}
}

function buildFrontmatterDeco(state: EditorState): DecorationSet {
	const fm = frontmatterRange(state);
	if (!fm) return Decoration.none;
	const collapsed = state.field(frontmatterCollapsed);
	if (collapsed) {
		// Substitui o bloco inteiro pela barra (colapsado).
		return Decoration.set([
			Decoration.replace({
				widget: new FrontmatterBarWidget(true),
				block: true,
			}).range(fm.from, fm.to),
		]);
	}
	// Expandido: alça de recolher acima do YAML cru (que segue visível).
	return Decoration.set([
		Decoration.widget({
			widget: new FrontmatterBarWidget(false),
			block: true,
			side: -1,
		}).range(0),
	]);
}

const frontmatterFold = StateField.define<DecorationSet>({
	create: (state) => buildFrontmatterDeco(state),
	update(deco, tr) {
		if (tr.docChanged || tr.effects.some((e) => e.is(toggleFrontmatter))) {
			return buildFrontmatterDeco(tr.state);
		}
		return deco.map(tr.changes);
	},
	provide: (f) => EditorView.decorations.from(f),
});

// --- Fonte de Autocomplete customizada (/, @, #) ---
export const customCompletionSource = (
	context: CompletionContext,
): CompletionResult | null => {
	const word = context.matchBefore(/[/@#]\w*/);
	if (!word) return null;

	const trigger = word.text[0];
	const query = word.text.slice(1).toLowerCase();
	const store = useVaultStore.getState();

	if (trigger === "/") {
		const options = [
			{ label: "Tarefa (Task)", detail: "- [ ] ", apply: "- [ ] " },
			{
				label: "Agendar (Date)",
				detail: "📅 YYYY-MM-DD",
				apply: () => {
					const today = getLocalDateString();
					return `📅 ${today} `;
				},
			},
			{
				label: "Compromisso (Event)",
				detail: "- [ ] 🗓️ YYYY-MM-DD ⏰ HH:MM",
				apply: () => {
					const today = getLocalDateString();
					// Compromisso PRECISA da checkbox — o parser só vira AgendaItem
					// a partir de uma linha `- [ ]` (parser.ts). Sem o prefixo a
					// linha era ignorada e o compromisso nunca aparecia no painel.
					return `- [ ] 🗓️ ${today} ⏰ 09:00 `;
				},
			},
			{ label: "Duração (Duration)", detail: "⏱️ min", apply: "⏱️ 30min " },
			{ label: "Projeto (Tag)", detail: "#", apply: "#" },
		];

		return {
			from: word.from,
			// filter:false — já filtramos por `query`; sem isso o CM re-filtraria
			// pelo texto a partir do `/` (ex: "/ag") contra os labels e descartaria
			// tudo (nenhum label contém "/").
			filter: false,
			options: options
				.filter((o) => o.label.toLowerCase().includes(query))
				.map((o) => ({
					label: o.label,
					detail: o.detail,
					apply: o.apply,
					type: "keyword",
				})),
		};
	}

	if (trigger === "@") {
		const rawQuery = word.text.slice(1).trim();

		// 1. Notas livres (type: note) — linka por título.
		const options: Completion[] = store.notes
			.filter((n) => n.type === "note" && n.title.toLowerCase().includes(query))
			.map((n) => ({
				label: n.title,
				apply: `[[${n.title}]] `,
				type: "variable",
			}));

		// 1b. Tasks-nó (type: task) — linka por título (entidade forte).
		for (const n of store.notes) {
			if (n.type !== "task") continue;
			if (!n.title.toLowerCase().includes(query)) continue;
			options.push({
				label: n.title,
				detail: "task",
				apply: `[[${n.title}]] `,
				type: "variable",
			});
		}

		// 2. Dias (nós daily) — linka pela data ISO ([[YYYY-MM-DD]] resolve no
		// clique via regex de data). Sempre oferece Hoje/Ontem; demais dias só
		// quando há query (evita poluir com o histórico inteiro).
		const todayStr = getLocalDateString();
		const yestStr = addDays(todayStr, -1);
		const dayDates = new Set<string>([todayStr, yestStr]);
		for (const n of store.notes) {
			if (n.type !== "daily") continue;
			const d = dailyDateFromPath(n.path);
			if (d) dayDates.add(d);
		}
		const dayLabel = (d: string) =>
			d === todayStr ? `Hoje · ${d}` : d === yestStr ? `Ontem · ${d}` : d;
		const dayOptions: Completion[] = [...dayDates]
			.filter((d) =>
				query.length === 0
					? d === todayStr || d === yestStr
					: d.includes(query) || dayLabel(d).toLowerCase().includes(query),
			)
			.sort((a, b) => b.localeCompare(a))
			.map((d) => ({
				label: `📅 ${dayLabel(d)}`,
				detail: "dia",
				apply: `[[${d}]] `,
				type: "variable",
			}));
		options.push(...dayOptions);

		// 3. Se não casa exatamente com nota existente nem é uma data, oferece
		// criar uma nota nova (insere o link + cria o arquivo).
		const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(rawQuery);
		const hasExact = store.notes.some(
			(n) => n.title.toLowerCase() === rawQuery.toLowerCase(),
		);
		if (rawQuery.length > 0 && !hasExact && !isIsoDate) {
			options.push({
				label: `Criar nota: ${rawQuery}`,
				detail: "nova",
				type: "text",
				apply: (view, _completion, from, to) => {
					view.dispatch({
						changes: { from, to, insert: `[[${rawQuery}]] ` },
					});
					const root = useVaultStore.getState().rootHandle;
					if (root) {
						createNote(root, rawQuery)
							.then(({ index }) => {
								useVaultStore.getState().setVaultData(index);
							})
							.catch((err) => console.error("Erro ao criar nota:", err));
					}
				},
			});
			// Criar task forte (nó) com o texto do query como título.
			options.push({
				label: `Criar task: ${rawQuery}`,
				detail: "task",
				type: "text",
				apply: (view, _completion, from, to) => {
					view.dispatch({
						changes: { from, to, insert: `[[${rawQuery}]] ` },
					});
					const root = useVaultStore.getState().rootHandle;
					if (root) {
						createTaskNode(root, rawQuery)
							.then(({ index }) => {
								useVaultStore.getState().setVaultData(index);
							})
							.catch((err) => console.error("Erro ao criar task:", err));
					}
				},
			});
		}

		return { from: word.from, filter: false, options };
	}

	if (trigger === "#") {
		return {
			from: word.from,
			filter: false,
			options: store.projects
				.filter((p) => p.tag.toLowerCase().includes(query))
				.map((p) => ({
					label: p.tag,
					apply: `#${p.tag} `,
					type: "property",
				})),
		};
	}

	return null;
};

interface DailyEditorProps {
	initialValue: string;
	filePath: string;
	onLinkClick?: (noteName: string) => void;
}

export function DailyEditor({
	initialValue,
	filePath,
	onLinkClick,
}: DailyEditorProps) {
	const editorRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const saveMutation = useSaveNote();

	// Referências mutáveis para o de-bounce de escrita e flush
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const currentContentRef = useRef(initialValue);
	const lastSavedContentRef = useRef(initialValue);
	const onLinkClickRef = useRef(onLinkClick);

	// Mantém as referências atualizadas
	useEffect(() => {
		onLinkClickRef.current = onLinkClick;
	}, [onLinkClick]);

	// Helper para contar palavras
	const countWords = useCallback((text: string) => {
		if (!text.trim()) return 0;
		return text.trim().split(/\s+/).length;
	}, []);

	// Atualiza referências quando o initialValue muda do exterior
	useEffect(() => {
		currentContentRef.current = initialValue;
		lastSavedContentRef.current = initialValue;

		// Atualiza contadores iniciais no store
		useVaultStore.getState().setActiveWordCount(countWords(initialValue));
		useVaultStore.getState().setActiveSaveStatus("saved");
		useVaultStore.getState().setActiveCursorPos({ line: 1, col: 1 });

		if (viewRef.current) {
			const cur = viewRef.current.state.doc.toString();
			if (cur !== initialValue) {
				// Diff mínimo (prefixo/sufixo comum): troca só o trecho alterado, em vez
				// de reescrever o doc inteiro. Assim o CodeMirror remapeia a seleção e o
				// cursor NÃO pula quando o re-index do auto-save reescreve initialValue
				// (ex.: 1º save injeta o frontmatter no topo e o disco passa a diferir).
				let start = 0;
				const max = Math.min(cur.length, initialValue.length);
				while (start < max && cur[start] === initialValue[start]) start++;
				let endCur = cur.length;
				let endNew = initialValue.length;
				while (
					endCur > start &&
					endNew > start &&
					cur[endCur - 1] === initialValue[endNew - 1]
				) {
					endCur--;
					endNew--;
				}
				viewRef.current.dispatch({
					changes: {
						from: start,
						to: endCur,
						insert: initialValue.slice(start, endNew),
					},
				});
			}
		}
	}, [initialValue, countWords]);

	// Função de salvamento imediata (Flush)
	const flushSave = useCallback(() => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
			saveTimeoutRef.current = null;
		}
		const currentText = currentContentRef.current;
		if (currentText !== lastSavedContentRef.current) {
			useVaultStore.getState().setActiveSaveStatus("saving");
			saveMutation.mutate(
				{ path: filePath, content: currentText },
				{
					onSuccess: () => {
						lastSavedContentRef.current = currentText;
						useVaultStore.getState().setActiveSaveStatus("saved");
					},
					onError: () => {
						useVaultStore.getState().setActiveSaveStatus("unsaved");
					},
				},
			);
		}
	}, [filePath, saveMutation.mutate]);

	// Inicialização do CodeMirror 6
	useEffect(() => {
		if (!editorRef.current) return;

		// Listener de modificação
		const updateListener = EditorView.updateListener.of((update) => {
			// Atualiza posição do cursor no statusbar
			if (update.docChanged || update.selectionSet) {
				const head = update.state.selection.main.head;
				const lineObj = update.state.doc.lineAt(head);
				const line = lineObj.number;
				const col = head - lineObj.from + 1;
				useVaultStore.getState().setActiveCursorPos({ line, col });
			}

			if (update.docChanged) {
				const newVal = update.state.doc.toString();
				currentContentRef.current = newVal;

				// Atualiza contagem de palavras
				useVaultStore.getState().setActiveWordCount(countWords(newVal));
				useVaultStore.getState().setActiveSaveStatus("unsaved");

				// Cancela o timeout pendente
				if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

				// Agenda salvamento com 1s debounce
				saveTimeoutRef.current = setTimeout(() => {
					useVaultStore.getState().setActiveSaveStatus("saving");
					saveMutation.mutate(
						{ path: filePath, content: newVal },
						{
							onSuccess: () => {
								lastSavedContentRef.current = newVal;
								useVaultStore.getState().setActiveSaveStatus("saved");
							},
							onError: () => {
								useVaultStore.getState().setActiveSaveStatus("unsaved");
							},
						},
					);
				}, 1000);
			}
		});

		// Configuração dos clicks em links
		const clickHandler = EditorView.domEventHandlers({
			click(event) {
				const target = event.target as HTMLElement;
				const linkChip = target.closest(".cm-chip-link");
				if (linkChip instanceof HTMLElement) {
					// dataset.link tem o nome limpo (innerText traria o ícone 🔗 junto).
					const cleanLink = (
						linkChip.dataset.link ??
						linkChip.innerText.replace(/^\[\[/, "").replace(/\]\]$/, "")
					).trim();
					if (onLinkClickRef.current) {
						onLinkClickRef.current(cleanLink);
					}
				}
			},
		});

		const view = new EditorView({
			state: EditorState.create({
				doc: currentContentRef.current,
				// Setup explícito (sem basicSetup) — um ÚNICO autocompletion, então
				// o override (nossa fonte / @ #) sempre se aplica. Sem gutter de
				// número de linha/fold (feel Notion).
				extensions: [
					history(),
					drawSelection(),
					// tooltip no body — evita ser clipado pelos overflow dos painéis
					tooltips({ parent: document.body }),
					indentOnInput(),
					syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
					keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
					autocompletion({
						override: [customCompletionSource],
						activateOnTyping: true,
					}),
					markdown(),
					chipPlugin,
					livePreviewPlugin,
					hrField,
					frontmatterCollapsed,
					frontmatterFold,
					updateListener,
					clickHandler,
					EditorView.lineWrapping,
				],
			}),
			parent: editorRef.current,
		});

		viewRef.current = view;

		// Registra o editor ativo no Zustand para o toggleTask se comunicar com ele
		useVaultStore.getState().setActiveEditor(view, filePath);

		return () => {
			// Executa o flush de salvamento pendente ANTES de destruir a view
			flushSave();
			view.destroy();
			viewRef.current = null;
			useVaultStore.getState().setActiveEditor(null, null);
		};
	}, [filePath, saveMutation.mutate, flushSave, countWords]);

	// Decomposição da data para o layout do Data-Herói
	const dateStr = dailyDateFromPath(filePath);
	const getHeroDateParts = (dateVal: string | null) => {
		if (!dateVal) return null;
		try {
			const d = new Date(`${dateVal}T12:00:00`);
			const weekday =
				d.toLocaleDateString("pt-BR", { weekday: "long" }).split("-")[0] || "";
			const day = d.toLocaleDateString("pt-BR", { day: "numeric" });
			const monthYear = d.toLocaleDateString("pt-BR", {
				month: "long",
				year: "numeric",
			});
			const cleanMonthYear = monthYear
				.replace(" de ", " · ")
				.replace(" de", "");
			return { weekday, day, monthYear: cleanMonthYear };
		} catch {
			return { weekday: "", day: "", monthYear: dateVal };
		}
	};
	const dateParts = getHeroDateParts(dateStr);

	return (
		<div className="editor-scroll">
			<div className="editor-container">
				{dateParts && (
					<>
						<div className="hero">
							<span className="wd">{dateParts.weekday}</span>
							<span className="dd">{dateParts.day}</span>
							<span className="my">{dateParts.monthYear}</span>
						</div>
						<div className="hero-rule" />
					</>
				)}
				<div className="prose" ref={editorRef} />
			</div>
		</div>
	);
}
