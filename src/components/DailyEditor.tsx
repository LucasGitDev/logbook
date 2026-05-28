import {
	autocompletion,
	type CompletionContext,
	type CompletionResult,
} from "@codemirror/autocomplete";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState, type Range } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { basicSetup, EditorView } from "codemirror";
import { useCallback, useEffect, useRef, useState } from "react";
import { getLocalDateString } from "@/lib/dates";
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

// --- Fonte de Autocomplete customizada (/, @, #) ---
const customCompletionSource = (
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
				detail: "🗓️ YYYY-MM-DD ⏰ HH:MM",
				apply: () => {
					const today = getLocalDateString();
					return `🗓️ ${today} ⏰ 09:00 `;
				},
			},
			{ label: "Duração (Duration)", detail: "⏱️ min", apply: "⏱️ 30min " },
			{ label: "Projeto (Tag)", detail: "#", apply: "#" },
		];

		return {
			from: word.from,
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
		return {
			from: word.from,
			options: store.notes
				.filter((n) => n.title.toLowerCase().includes(query))
				.map((n) => ({
					label: n.title,
					apply: `[[${n.title}]] `,
					type: "variable",
				})),
		};
	}

	if (trigger === "#") {
		return {
			from: word.from,
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
	const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
		"saved",
	);

	// Referências mutáveis para o debounce de escrita e flush
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const currentContentRef = useRef(initialValue);
	const lastSavedContentRef = useRef(initialValue);
	const onLinkClickRef = useRef(onLinkClick);

	// Mantém as referências atualizadas
	useEffect(() => {
		onLinkClickRef.current = onLinkClick;
	}, [onLinkClick]);

	// Atualiza referências quando o initialValue muda do exterior
	useEffect(() => {
		currentContentRef.current = initialValue;
		lastSavedContentRef.current = initialValue;
		if (viewRef.current) {
			const currentViewText = viewRef.current.state.doc.toString();
			if (currentViewText !== initialValue) {
				viewRef.current.dispatch({
					changes: {
						from: 0,
						to: currentViewText.length,
						insert: initialValue,
					},
				});
			}
		}
	}, [initialValue]);

	// Função de salvamento imediata (Flush)
	const flushSave = useCallback(() => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
			saveTimeoutRef.current = null;
		}
		const currentText = currentContentRef.current;
		if (currentText !== lastSavedContentRef.current) {
			setSaveStatus("saving");
			saveMutation.mutate(
				{ path: filePath, content: currentText },
				{
					onSuccess: () => {
						lastSavedContentRef.current = currentText;
						setSaveStatus("saved");
					},
					onError: () => {
						setSaveStatus("unsaved");
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
			if (update.docChanged) {
				const newVal = update.state.doc.toString();
				currentContentRef.current = newVal;
				setSaveStatus("unsaved");

				// Cancela o timeout pendente
				if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

				// Agenda salvamento com 1s debounce
				saveTimeoutRef.current = setTimeout(() => {
					setSaveStatus("saving");
					saveMutation.mutate(
						{ path: filePath, content: newVal },
						{
							onSuccess: () => {
								lastSavedContentRef.current = newVal;
								setSaveStatus("saved");
							},
							onError: () => {
								setSaveStatus("unsaved");
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
				if (target.classList.contains("cm-chip-link")) {
					const cleanLink = target.innerText
						.replace(/^\[\[/, "")
						.replace(/\]\]$/, "")
						.trim();
					if (onLinkClickRef.current) {
						onLinkClickRef.current(cleanLink);
					}
				}
			},
		});

		const view = new EditorView({
			state: EditorState.create({
				doc: currentContentRef.current,
				extensions: [
					basicSetup,
					markdown(),
					autocompletion({ override: [customCompletionSource] }),
					chipPlugin,
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
	}, [
		filePath,
		saveMutation.mutate, // Executa o flush de salvamento pendente ANTES de destruir a view
		flushSave,
	]); // Recria o editor apenas se o arquivo mudar

	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,22,0.3)]">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
						Editor
					</span>
					<span className="text-xs text-gray-500 font-mono">{filePath}</span>
				</div>
				<div className="flex items-center gap-2">
					{saveStatus === "saved" && (
						<span className="flex items-center gap-1.5 text-xs text-emerald-400">
							<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
							Salvo no disco
						</span>
					)}
					{saveStatus === "saving" && (
						<span className="flex items-center gap-1.5 text-xs text-indigo-400">
							<span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
							Salvando...
						</span>
					)}
					{saveStatus === "unsaved" && (
						<span className="flex items-center gap-1.5 text-xs text-amber-400">
							<span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
							Alterações não salvas
						</span>
					)}
				</div>
			</div>
			<div className="flex-1 overflow-y-auto px-8" ref={editorRef} />
		</div>
	);
}
