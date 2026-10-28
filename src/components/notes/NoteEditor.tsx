import { useEffect, useRef, type MutableRefObject } from "react";
import { EditorSelection, EditorState, type Range } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  placeholder,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { autocompletion, startCompletion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { tags as t } from "@lezer/highlight";
import { TAG_RE, parseWiki } from "../../lib/notes";

export interface EditorApi {
  gotoLine: (line: number) => void;
  focus: () => void;
  /** Formatting toolbar: wrap the selection (bold, italic, code), prefix the current lines (headings, lists), or insert a link. */
  wrap: (mark: string) => void;
  linePrefix: (prefix: string) => void;
  link: () => void;
  /** Types text at the cursor as if typed (so "[[" opens the note picker). */
  insert: (text: string) => void;
}

/** Adds a prefix like "## " or "- [ ] " to the selected lines, replacing any heading/list/quote prefix they had; toggles it off if already there. */
function setLinePrefix(view: EditorView, prefix: string) {
  const { state } = view;
  const changes: { from: number; to: number; insert: string }[] = [];
  const seen = new Set<number>();
  for (const r of state.selection.ranges)
    for (let pos = r.from; pos <= r.to; ) {
      const line = state.doc.lineAt(pos);
      if (!seen.has(line.number)) {
        seen.add(line.number);
        const m = /^(#{1,6} |- \[[ x]\] |[-*] |\d+\. |> )/.exec(line.text);
        const current = m ? m[1] : "";
        const next = current === prefix ? "" : prefix;
        changes.push({ from: line.from, to: line.from + current.length, insert: next });
      }
      pos = line.to + 1;
    }
  view.dispatch({ changes, userEvent: "input" });
  view.focus();
}

const highlight = HighlightStyle.define([
  { tag: t.heading1, fontWeight: "700" },
  { tag: t.heading2, fontWeight: "700" },
  { tag: t.heading3, fontWeight: "650" },
  { tag: [t.heading4, t.heading5, t.heading6], fontWeight: "650" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "var(--accent)" },
  { tag: t.url, color: "var(--muted)" },
  { tag: t.monospace, fontFamily: "var(--f-mono)", fontSize: "0.88em" },
  { tag: t.quote, color: "var(--muted)" },
  { tag: [t.processingInstruction, t.meta, t.contentSeparator], color: "var(--faint)" },
]);

const theme = EditorView.theme({
  "&": { fontSize: "16px", color: "var(--fg)", backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--f-body)", lineHeight: "1.7", overflow: "visible" },
  ".cm-content": { padding: "4px 0 40vh", caretColor: "var(--accent)" },
  ".cm-line": { padding: "0" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in srgb, var(--accent) 22%, transparent) !important",
  },
  ".cm-cursor": { borderLeftColor: "var(--accent)", borderLeftWidth: "2px" },
  ".cm-placeholder": { color: "var(--faint)" },
  ".cm-tooltip": {
    background: "var(--panel)",
    border: "1px solid var(--line)",
    borderRadius: "8px",
    boxShadow: "var(--shadow)",
    overflow: "hidden",
  },
  ".cm-tooltip-autocomplete > ul": { fontFamily: "var(--f-body)", maxHeight: "260px" },
  ".cm-tooltip-autocomplete > ul > li": { padding: "4px 10px !important" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { background: "var(--hover)", color: "var(--fg)" },
  ".cm-completionDetail": { color: "var(--faint)", fontStyle: "normal", marginLeft: "8px" },
});

const hide = Decoration.replace({});

/** A real checkbox in place of "- [ ]" / "- [x]"; clicking it ticks the item in the text. */
class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly pos: number,
  ) {
    super();
  }
  eq(other: CheckboxWidget) {
    return other.checked === this.checked && other.pos === this.pos;
  }
  toDOM(view: EditorView) {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = this.checked;
    box.className = "cm-task-box";
    box.setAttribute("aria-label", this.checked ? "Desmarcar item" : "Marcar item");
    box.addEventListener("mousedown", (e) => e.preventDefault());
    box.addEventListener("click", (e) => {
      e.preventDefault();
      view.dispatch({ changes: { from: this.pos, to: this.pos + 1, insert: this.checked ? " " : "x" }, userEvent: "input" });
    });
    return box;
  }
  ignoreEvent() {
    return true;
  }
}
/** "•" in place of "-" / "*" for plain list items. */
class BulletWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const s = document.createElement("span");
    s.className = "cm-bullet";
    s.textContent = "•";
    return s;
  }
}
const bullet = Decoration.replace({ widget: new BulletWidget() });
const WIKI = /\[\[([^\]\n]+?)\]\]/g;
const lineDeco = (cls: string) => Decoration.line({ class: cls });

/** Obsidian-style live preview: markup characters disappear on lines the cursor is not on. */
function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const active = new Set<number>();
  if (view.hasFocus)
    for (const r of state.selection.ranges) {
      const a = state.doc.lineAt(r.from).number,
        b = state.doc.lineAt(r.to).number;
      for (let i = a; i <= b; i++) active.add(i);
    }
  const out: Range<Decoration>[] = [];
  const code: [number, number][] = [];
  const inCode = (a: number, b: number) => code.some(([c, d]) => a < d && b > c);
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        const line = state.doc.lineAt(node.from);
        const name = node.name;
        const h = /^(?:ATX|Setext)Heading(\d)$/.exec(name);
        if (h) out.push(lineDeco("cm-h" + h[1]).range(line.from));
        if (name === "Blockquote") {
          for (let p = node.from; p <= node.to; ) {
            const l = state.doc.lineAt(p);
            out.push(lineDeco("cm-quote").range(l.from));
            p = l.to + 1;
          }
        }
        if (name === "FencedCode" || name === "InlineCode" || name === "CodeBlock") code.push([node.from, node.to]);
        if (name === "FencedCode") {
          for (let p = node.from; p <= node.to; ) {
            const l = state.doc.lineAt(p);
            out.push(lineDeco("cm-codeblock").range(l.from));
            p = l.to + 1;
          }
          return false;
        }
        if (name === "InlineCode") out.push(Decoration.mark({ class: "cm-inline-code" }).range(node.from, node.to));
        if (active.has(line.number)) return;
        if (name === "HeaderMark" || name === "QuoteMark") {
          let end = node.to;
          if (state.doc.sliceString(end, end + 1) === " ") end++;
          if (end > node.from) out.push(hide.range(node.from, end));
        } else if (
          name === "EmphasisMark" ||
          name === "StrikethroughMark" ||
          (name === "CodeMark" && node.node.parent?.name === "InlineCode")
        ) {
          out.push(hide.range(node.from, node.to));
        }
      },
    });
    // Checklists and bullets render as widgets outside the line being edited.
    for (let pos = from; pos <= to; ) {
      const line = state.doc.lineAt(pos);
      if (!active.has(line.number) && !inCode(line.from, line.to)) {
        const task = /^(\s*)[-*+] \[([ xX])\] /.exec(line.text);
        const item = !task && /^(\s*)[-*+] /.exec(line.text);
        if (task) {
          const start = line.from + task[1].length;
          out.push(Decoration.replace({ widget: new CheckboxWidget(task[2] !== " ", start + 3) }).range(start, start + 6));
          if (task[2] !== " ") out.push(Decoration.mark({ class: "cm-task-done" }).range(start + 6, line.to));
        } else if (item) {
          const start = line.from + item[1].length;
          out.push(bullet.range(start, start + 1));
        }
      }
      pos = line.to + 1;
    }
    const text = state.doc.sliceString(from, to);
    for (const m of text.matchAll(WIKI)) {
      const s = from + m.index!,
        e = s + m[0].length;
      if (inCode(s, e)) continue;
      const p = parseWiki(m[1]);
      const attrs = { "data-target": p.target };
      if (active.has(state.doc.lineAt(s).number)) {
        out.push(Decoration.mark({ class: "cm-wikilink", attributes: attrs }).range(s, e));
      } else {
        const shownFrom = p.alias ? s + 2 + m[1].lastIndexOf("|") + 1 : s + 2;
        out.push(hide.range(s, shownFrom));
        if (e - 2 > shownFrom)
          out.push(Decoration.mark({ class: "cm-wikilink cm-wikilink-live", attributes: attrs }).range(shownFrom, e - 2));
        out.push(hide.range(e - 2, e));
      }
    }
    for (const m of text.matchAll(TAG_RE)) {
      const s = from + m.index! + m[1].length;
      if (inCode(s, s + 1)) continue;
      out.push(
        Decoration.mark({ class: "cm-tag", attributes: { "data-tag": m[2].toLowerCase() } }).range(s, s + 1 + m[2].length),
      );
    }
  }
  return Decoration.set(out, true);
}

const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.selectionSet || u.viewportChanged || u.focusChanged) this.decorations = buildDecorations(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

function wrapWith(mark: string) {
  return (view: EditorView) => {
    view.dispatch(
      view.state.changeByRange((r) => ({
        changes: [
          { from: r.from, insert: mark },
          { from: r.to, insert: mark },
        ],
        range: EditorSelection.range(r.from + mark.length, r.to + mark.length),
      })),
      { userEvent: "input" },
    );
    return true;
  };
}
function insertLink(view: EditorView) {
  const r = view.state.selection.main;
  if (r.empty) return false; // let Ctrl/Cmd+K open the search instead
  const text = view.state.sliceDoc(r.from, r.to);
  view.dispatch({
    changes: { from: r.from, to: r.to, insert: `[${text}](url)` },
    selection: EditorSelection.range(r.from + text.length + 3, r.from + text.length + 6),
  });
  return true;
}

export function NoteEditor(props: {
  noteId: string;
  body: string;
  titles: () => string[];
  onChange: (body: string) => void;
  onOpenLink: (title: string) => void;
  onTag: (tag: string) => void;
  apiRef?: MutableRefObject<EditorApi | null>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const cb = useRef(props);
  cb.current = props;

  useEffect(() => {
    const complete = (ctx: CompletionContext): CompletionResult | null => {
      const m = ctx.matchBefore(/\[\[[^\]\n|#]*/);
      if (!m) return null;
      return {
        from: m.from + 2,
        validFor: /^[^\]\n|#]*$/,
        options: cb.current.titles().map((title) => ({
          label: title,
          type: "text",
          apply: (view: EditorView, _c: unknown, from: number, to: number) => {
            const closed = view.state.sliceDoc(to, to + 2) === "]]";
            view.dispatch({
              changes: { from, to, insert: title + (closed ? "" : "]]") },
              selection: { anchor: from + title.length + 2 },
            });
          },
        })),
      };
    };
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: props.body,
        extensions: [
          history(),
          keymap.of([
            { key: "Mod-b", run: wrapWith("**") },
            { key: "Mod-i", run: wrapWith("*") },
            { key: "Mod-k", run: insertLink },
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          markdown({ base: markdownLanguage }),
          syntaxHighlighting(highlight),
          livePreview,
          EditorView.lineWrapping,
          placeholder("Comece a escrever… Use [[ para ligar a outra nota e # para tags."),
          autocompletion({ override: [complete], icons: false }),
          theme,
          EditorView.contentAttributes.of({ "aria-label": "Texto da anotação", spellcheck: "true" }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cb.current.onChange(u.state.doc.toString());
          }),
          EditorView.domEventHandlers({
            mousedown: (e) => {
              const el = (e.target as HTMLElement).closest<HTMLElement>(".cm-wikilink, .cm-tag");
              if (!el) return false;
              const mod = e.metaKey || e.ctrlKey;
              if (el.classList.contains("cm-wikilink") && (mod || el.classList.contains("cm-wikilink-live"))) {
                e.preventDefault();
                cb.current.onOpenLink(el.dataset.target!);
                return true;
              }
              if (el.classList.contains("cm-tag") && mod) {
                e.preventDefault();
                cb.current.onTag(el.dataset.tag!);
                return true;
              }
              return false;
            },
          }),
        ],
      }),
    });
    viewRef.current = view;
    if (props.apiRef)
      props.apiRef.current = {
        focus: () => view.focus(),
        gotoLine: (n) => {
          const line = view.state.doc.line(Math.min(n + 1, view.state.doc.lines));
          view.dispatch({
            selection: { anchor: line.from },
            effects: EditorView.scrollIntoView(line.from, { y: "start", yMargin: 80 }),
          });
          view.focus();
        },
        wrap: (mark) => {
          wrapWith(mark)(view);
          view.focus();
        },
        linePrefix: (prefix) => setLinePrefix(view, prefix),
        insert: (text) => {
          const r = view.state.selection.main;
          view.dispatch({
            changes: { from: r.from, to: r.to, insert: text },
            selection: { anchor: r.from + text.length },
            userEvent: "input.type",
          });
          view.focus();
          startCompletion(view);
        },
        link: () => {
          const r = view.state.selection.main;
          const text = view.state.sliceDoc(r.from, r.to) || "texto";
          view.dispatch({
            changes: { from: r.from, to: r.to, insert: `[${text}](https://)` },
            selection: EditorSelection.range(r.from + text.length + 3, r.from + text.length + 11),
          });
          view.focus();
        },
      };
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [props.noteId]);

  // Changes made elsewhere (another device, renamed links) flow in while you're not typing here.
  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    const cur = v.state.doc.toString();
    if (cur !== props.body && !v.hasFocus) v.dispatch({ changes: { from: 0, to: cur.length, insert: props.body } });
  }, [props.body]);

  return <div className="note-editor" ref={host} />;
}
