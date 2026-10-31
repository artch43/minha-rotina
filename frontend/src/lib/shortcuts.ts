import { useStore, deleteEvent, deleteHabit, deleteItem, deleteNote, deleteTodo } from "@/store";

export const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
/** How the modifier key is shown: ⌘ on Apple devices, Ctrl+ elsewhere. */
export const MOD = IS_MAC ? "⌘" : "Ctrl+";

/** Ctrl+Delete / Ctrl+Backspace, or ⌘⌫ / ⌘⌦ on a Mac. */
export const isDeleteShortcut = (e: KeyboardEvent) =>
  (e.metaKey || e.ctrlKey) && !e.altKey && (e.key === "Backspace" || e.key === "Delete");

/** Inside text fields the shortcut keeps its usual meaning (delete a word or line). */
export function isEditable(el: Element | null) {
  if (!el) return false;
  const h = el as HTMLElement;
  return h.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(h.tagName) || !!h.closest(".cm-editor");
}

let hovered: Element | null = null;
if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerover",
    (e) => {
      hovered = e.target as Element;
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", () => {
    hovered = null;
  });
}

type Target = { kind: string; id: string };
const parse = (v?: string | null): Target | null => {
  if (!v) return null;
  const i = v.indexOf(":");
  return i > 0 ? { kind: v.slice(0, i), id: v.slice(i + 1) } : null;
};

/** What the shortcut would delete right now: the focused item, else the one under the mouse, else whatever is open. */
export function deleteTarget(): Target | null {
  const active = document.activeElement;
  const fromFocus = parse(active?.closest("[data-del]")?.getAttribute("data-del"));
  if (fromFocus) return fromFocus;
  const fromHover = parse(hovered?.closest("[data-del]")?.getAttribute("data-del"));
  if (fromHover) return fromHover;
  return openTarget() ?? openNote();
}

/** The task or event whose panel/window is open. */
function openTarget(): Target | null {
  const { ui } = useStore.getState();
  if (ui.eventDialog?.id) return { kind: "event", id: ui.eventDialog.id };
  if (ui.peek) return { kind: "task", id: ui.peek };
  return null;
}
function openNote(): Target | null {
  const { ui } = useStore.getState();
  return ui.route === "notes" && ui.noteId ? { kind: "note", id: ui.noteId } : null;
}

/** The title field of the open task or event (not tags, dates or other text, where ⌘⌫ deletes words). */
function isShortField(el: Element | null) {
  return !!el && el.tagName === "INPUT" && el.hasAttribute("data-title-field");
}

export function deleteByShortcut(t: Target) {
  const { setUi } = useStore.getState();
  switch (t.kind) {
    case "task":
      deleteItem(t.id);
      break;
    case "event":
      setUi((u) => {
        if (u.eventDialog?.id === t.id) u.eventDialog = null;
      });
      deleteEvent(t.id);
      break;
    case "todo":
      deleteTodo(t.id);
      break;
    case "note":
      deleteNote(t.id);
      break;
    case "habit":
      deleteHabit(t.id);
      break;
    default:
      return false;
  }
  return true;
}

/** Global key handler: call once from the app shell. Returns the cleanup function. */
export function installDeleteShortcut() {
  const onKey = (e: KeyboardEvent) => {
    if (!isDeleteShortcut(e)) return;
    let t: Target | null;
    if (isEditable(document.activeElement)) {
      // The task panel and the event window open with the cursor in the title: there the shortcut
      // still deletes what is open. Every other field keeps its usual "delete the word/line".
      t = openTarget();
      if (!t || !isShortField(document.activeElement)) return;
    } else t = deleteTarget();
    if (!t) return;
    e.preventDefault();
    deleteByShortcut(t);
  };
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}
