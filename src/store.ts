import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { toast as sonner } from "sonner";
import type { Area, CalendarEvent, Color, Group, Item, Note, PropValue, Todo, Workspace } from "./lib/types";
import { template, mkDb, DEFAULT_STATUS } from "./lib/template";
import { applyStatusChange, childrenOf, runReviews, statusProp } from "./lib/model";
import { today, uid } from "./lib/util";
import { dailyBody, findByTitle, renameLinks, uniqueTitle } from "./lib/notes";
import { STORAGE_KEY, workspaceStorage } from "./lib/storage";
import { normalizeWorkspace } from "./lib/migrate";

export type Modal = "search" | "settings" | "trash" | "newBoard" | null;
export interface UI {
  route: string;
  peek: string | null;
  peekFocus: boolean;
  viewByDb: Record<string, string>;
  calMonth: Record<string, string>;
  search: Record<string, string>;
  modal: Modal;
  /** "all" or an area id: filters tasks and events everywhere. */
  area: string;
  /** Open event dialog: an event id, or a new event on a day. */
  eventDialog: { id: string | null; date?: string; start?: string } | null;
  statusDialog: string | null;
  calendar: { view: "month" | "week"; anchor: string; showTasks: boolean };
  noteId: string | null;
  noteMode: "edit" | "read";
  noteTag: string | null;
  notesTab: "list" | "note" | "side";
}
interface Store {
  ws: Workspace;
  ui: UI;
  mut: (fn: (ws: Workspace) => void) => void;
  setUi: (fn: (ui: UI) => void) => void;
}

const defaultUi: UI = {
  route: "home",
  peek: null,
  peekFocus: false,
  viewByDb: {},
  calMonth: {},
  search: {},
  modal: null,
  area: "all",
  eventDialog: null,
  statusDialog: null,
  calendar: { view: "month", anchor: today(), showTasks: true },
  noteId: null,
  noteMode: "edit",
  noteTag: null,
  notesTab: "list",
};

export const useStore = create<Store>()(
  persist(
    immer((set) => ({
      ws: template(),
      ui: defaultUi,
      mut: (fn) =>
        set((s) => {
          fn(s.ws);
        }),
      setUi: (fn) =>
        set((s) => {
          fn(s.ui);
        }),
    })),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: workspaceStorage,
      // Older saves are kept as they are here; `merge` below upgrades them with normalizeWorkspace.
      migrate: (persisted) => persisted as Store,
      partialize: (s) =>
        ({
          ws: s.ws,
          ui: {
            viewByDb: s.ui.viewByDb,
            noteMode: s.ui.noteMode,
            area: s.ui.area,
            calendar: { view: s.ui.calendar.view, showTasks: s.ui.calendar.showTasks },
          },
        }) as unknown as Store,
      merge: (persisted, current) => {
        const p = persisted as Partial<Store> | undefined;
        const ui = { ...current.ui, ...(p?.ui ?? {}) } as UI;
        ui.calendar = { ...current.ui.calendar, ...(p?.ui?.calendar ?? {}), anchor: today() };
        return { ...current, ws: p?.ws ? normalizeWorkspace(p.ws) : current.ws, ui };
      },
    },
  ),
);

/* ---------- actions ---------- */
const mut = (fn: (ws: Workspace) => void) => useStore.getState().mut(fn);
const setUi = (fn: (ui: UI) => void) => useStore.getState().setUi(fn);
const ws = () => useStore.getState().ws;

/** Short confirmation, with an optional "Desfazer". */
export function toast(msg: string, undo?: () => void) {
  if (undo) sonner(msg, { action: { label: "Desfazer", onClick: undo }, duration: 6000 });
  else sonner(msg);
}

export function replaceWorkspace(next: Workspace) {
  mut((w) => {
    Object.assign(w, next);
  });
  setUi((u) => {
    u.route = "home";
    u.peek = null;
  });
}

export function go(id: string) {
  setUi((u) => {
    u.route = id;
    u.peek = null;
  });
  if (location.hash !== "#/" + id) history.pushState(null, "", "#/" + id);
  document.querySelector("[data-scroll]")?.scrollTo(0, 0);
}
export function openPeek(id: string, focus = false) {
  setUi((u) => {
    u.peek = id;
    u.peekFocus = focus;
  });
}
export const closePeek = () =>
  setUi((u) => {
    u.peek = null;
  });
export const openModal = (m: Modal) =>
  setUi((u) => {
    u.modal = m;
  });

/* ---------- tasks ---------- */
export function setProp(itemId: string, propId: string, value: PropValue | null) {
  mut((w) => {
    const item = w.items[itemId];
    if (!item) return;
    const db = w.dbs[item.db];
    const prop = db.props.find((p) => p.id === propId);
    if (!prop) return;
    const old = item.props[propId];
    if (value === "" || value == null || (Array.isArray(value) && !value.length)) delete item.props[propId];
    else item.props[propId] = value;
    if (prop.type === "status" && old !== value) applyStatusChange(item, db, old, value ?? undefined);
    item.updated = Date.now();
  });
}
export function patchItem(itemId: string, fn: (it: Item) => void) {
  mut((w) => {
    const it = w.items[itemId];
    if (it) {
      fn(it);
      it.updated = Date.now();
    }
  });
}
/** New task: gets the area chosen at the top, or the database's default area. */
export function newItem(dbId: string, props: Record<string, PropValue> = {}, title = "") {
  const id = uid();
  const area = useStore.getState().ui.area;
  mut((w) => {
    const db = w.dbs[dbId];
    const sp = statusProp(db);
    const it: Item = {
      id,
      db: dbId,
      title,
      props: {},
      notes: "",
      created: Date.now(),
      updated: Date.now(),
      order: Date.now(),
      log: [],
      area: area !== "all" ? area : db.defaultArea,
    };
    if (sp?.options?.[0]) it.props[sp.id] = sp.options[0].id;
    Object.assign(it.props, props);
    w.items[id] = it;
  });
  return id;
}
export function deleteItem(id: string) {
  const snap = ws().items[id];
  mut((w) => {
    delete w.items[id];
  });
  setUi((u) => {
    if (u.peek === id) u.peek = null;
  });
  toast(
    "Tarefa excluída",
    snap &&
      (() =>
        mut((w) => {
          w.items[id] = snap;
        })),
  );
}

/* ---------- status columns ---------- */
function statusOf(w: Workspace, dbId: string) {
  return statusProp(w.dbs[dbId])!;
}
export function renameStatus(dbId: string, optId: string, name: string) {
  const clean = name.trim();
  if (!clean) return;
  mut((w) => {
    const o = statusOf(w, dbId).options!.find((x) => x.id === optId);
    if (o) o.name = clean;
  });
}
export function setStatusColor(dbId: string, optId: string, color: Color) {
  mut((w) => {
    const o = statusOf(w, dbId).options!.find((x) => x.id === optId);
    if (o) o.color = color;
  });
}
export function setStatusGroup(dbId: string, optId: string, group: Group) {
  mut((w) => {
    const o = statusOf(w, dbId).options!.find((x) => x.id === optId);
    if (o) o.group = group;
  });
}
export function moveStatus(dbId: string, optId: string, dir: -1 | 1) {
  mut((w) => {
    const list = statusOf(w, dbId).options!;
    const i = list.findIndex((x) => x.id === optId),
      j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
  });
}
export function addStatus(dbId: string, name = "Nova coluna") {
  const id = uid();
  mut((w) => {
    statusOf(w, dbId).options!.push({ id, name, color: "gray", group: "todo" });
  });
  return id;
}
/** Removes a column; its tasks move to the first remaining column. */
export function deleteStatus(dbId: string, optId: string) {
  const before = ws();
  const sp = statusProp(before.dbs[dbId])!;
  if (sp.options!.length <= 1) return;
  const opt = sp.options!.find((o) => o.id === optId)!;
  const index = sp.options!.indexOf(opt);
  const moved = Object.values(before.items)
    .filter((i) => i.db === dbId && i.props[sp.id] === optId)
    .map((i) => i.id);
  mut((w) => {
    const s = statusOf(w, dbId);
    s.options = s.options!.filter((o) => o.id !== optId);
    for (const id of moved) w.items[id].props[s.id] = s.options[0].id;
  });
  toast(`Coluna “${opt.name}” excluída`, () =>
    mut((w) => {
      const s = statusOf(w, dbId);
      s.options!.splice(index, 0, opt);
      for (const id of moved) if (w.items[id]) w.items[id].props[s.id] = optId;
    }),
  );
}

/* ---------- boards (databases) ---------- */
export function addBoard(title: string, icon: string, defaultArea?: string) {
  const id = uid();
  mut((w) => {
    const top = childrenOf(w, null);
    w.pages.push({
      id,
      title: title.trim() || "Nova lista",
      icon: icon || "🗂️",
      type: "db",
      parent: null,
      order: (top.at(-1)?.order ?? 0) + 1,
    });
    w.dbs[id] = mkDb(DEFAULT_STATUS, defaultArea);
  });
  go(id);
  return id;
}
export function renamePage(id: string, title: string, icon?: string) {
  mut((w) => {
    const p = w.pages.find((x) => x.id === id);
    if (!p) return;
    if (title.trim()) p.title = title.trim();
    if (icon) p.icon = icon;
  });
}
export function movePage(id: string, dir: -1 | 1) {
  mut((w) => {
    const list = childrenOf(w, null);
    const i = list.findIndex((p) => p.id === id),
      j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((p, k) => {
      p.order = k;
    });
  });
}
export function deletePage(id: string) {
  const before = ws();
  const snap = {
    page: before.pages.find((p) => p.id === id)!,
    db: before.dbs[id],
    items: Object.values(before.items).filter((it) => it.db === id),
  };
  mut((w) => {
    for (const it of Object.values(w.items)) if (it.db === id) delete w.items[it.id];
    delete w.dbs[id];
    w.pages = w.pages.filter((p) => p.id !== id);
  });
  if (useStore.getState().ui.route === id) go("home");
  toast(`“${snap.page.title}” excluída`, () =>
    mut((w) => {
      w.pages.push(snap.page);
      if (snap.db) w.dbs[id] = snap.db;
      for (const it of snap.items) w.items[it.id] = it;
    }),
  );
}

/* ---------- areas ---------- */
export function addArea(name: string, color: Area["color"]) {
  const id = uid();
  mut((w) => {
    w.settings.areas.push({ id, name: name.trim() || "Nova área", color });
  });
  return id;
}
export function updateArea(id: string, patch: Partial<Omit<Area, "id">>) {
  mut((w) => {
    const a = w.settings.areas.find((x) => x.id === id);
    if (a) Object.assign(a, patch);
  });
}
/** Deletes an area; its tasks and events become "Sem área". */
export function deleteArea(id: string) {
  mut((w) => {
    w.settings.areas = w.settings.areas.filter((a) => a.id !== id);
    for (const it of Object.values(w.items)) if (it.area === id) delete it.area;
    for (const ev of Object.values(w.events)) if (ev.area === id) delete ev.area;
    for (const db of Object.values(w.dbs)) if (db.defaultArea === id) delete db.defaultArea;
  });
  setUi((u) => {
    if (u.area === id) u.area = "all";
  });
}

/* ---------- events ---------- */
export function saveEvent(data: Omit<CalendarEvent, "id" | "created" | "updated">, id?: string | null) {
  const eid = id || uid();
  mut((w) => {
    const prev = w.events[eid];
    w.events[eid] = { ...data, id: eid, created: prev?.created ?? Date.now(), updated: Date.now() };
  });
  return eid;
}
export function moveEvent(id: string, date: string) {
  mut((w) => {
    const e = w.events[id];
    if (e && e.date !== date) {
      e.date = date;
      e.updated = Date.now();
    }
  });
}
export function deleteEvent(id: string) {
  const snap = ws().events[id];
  if (!snap) return;
  mut((w) => {
    delete w.events[id];
  });
  toast("Evento excluído", () =>
    mut((w) => {
      w.events[id] = snap;
    }),
  );
}
export const openEvent = (id: string | null, date?: string, start?: string) =>
  setUi((u) => {
    u.eventDialog = { id, date, start };
  });

/* ---------- to-do ---------- */
export function addTodo(text: string, extra: Partial<Todo> = {}) {
  const clean = text.trim();
  if (!clean) return null;
  const id = uid();
  const area = useStore.getState().ui.area;
  mut((w) => {
    const top = Math.min(0, ...Object.values(w.todos).map((t) => t.order));
    w.todos[id] = {
      id,
      text: clean,
      done: false,
      order: top - 1,
      created: Date.now(),
      ...(area !== "all" ? { area } : {}),
      ...extra,
    };
  });
  return id;
}
export function updateTodo(id: string, patch: Partial<Todo>) {
  mut((w) => {
    const t = w.todos[id];
    if (t) Object.assign(t, patch);
  });
}
export function toggleTodo(id: string) {
  mut((w) => {
    const t = w.todos[id];
    if (t) {
      t.done = !t.done;
      t.doneAt = t.done ? Date.now() : undefined;
    }
  });
}
export function deleteTodo(id: string) {
  const snap = ws().todos[id];
  if (!snap) return;
  mut((w) => {
    delete w.todos[id];
  });
  toast("Afazer excluído", () =>
    mut((w) => {
      w.todos[id] = snap;
    }),
  );
}
export function clearDoneTodos() {
  const done = Object.values(ws().todos).filter((t) => t.done);
  if (!done.length) return;
  mut((w) => {
    for (const t of done) delete w.todos[t.id];
  });
  toast(`${done.length} ${done.length === 1 ? "concluído apagado" : "concluídos apagados"}`, () =>
    mut((w) => {
      for (const t of done) w.todos[t.id] = t;
    }),
  );
}

/* ---------- habits ---------- */
export function toggleHabit(hid: string, day: string) {
  mut((w) => {
    const cur = w.habitLog[day] || [];
    const next = cur.includes(hid) ? cur.filter((x) => x !== hid) : [...cur, hid];
    if (next.length) w.habitLog[day] = next;
    else delete w.habitLog[day];
  });
}
export const checkReviews = () => mut(runReviews);

/* ---------- notes ---------- */
export function openNotes(noteId?: string | null) {
  setUi((u) => {
    u.route = "notes";
    u.peek = null;
    if (noteId !== undefined) u.noteId = noteId;
    u.notesTab = noteId ? "note" : "list";
  });
  const id = useStore.getState().ui.noteId;
  const hash = "#/notas" + (id ? "/" + id : "");
  if (location.hash !== hash) history.pushState(null, "", hash);
}

export function createNote(init: Partial<Note> = {}) {
  const id = uid();
  const now = Date.now();
  mut((w) => {
    w.notes[id] = {
      id,
      title: uniqueTitle(w.notes, init.title?.trim() || "Sem título"),
      folder: init.folder ?? "",
      body: init.body ?? "",
      created: now,
      updated: now,
    };
  });
  openNotes(id);
  return id;
}

/** Opens the note with this title, creating it (next to `nearFolder`) when it doesn't exist yet. */
export function openNoteByTitle(title: string, nearFolder = "") {
  const found = findByTitle(ws().notes, title);
  if (found) openNotes(found.id);
  else createNote({ title, folder: nearFolder });
}

export function updateNote(id: string, patch: Partial<Note>) {
  mut((w) => {
    const n = w.notes[id];
    if (n) Object.assign(n, patch, { updated: Date.now() });
  });
}

/** Renames a note and rewrites every [[link]] that pointed at the old title. */
export function renameNote(id: string, title: string) {
  const n = ws().notes[id];
  const next = title.trim() || "Sem título";
  if (!n || n.title === next) return;
  const old = n.title;
  mut((w) => {
    w.notes[id].title = next;
    w.notes[id].updated = Date.now();
    for (const other of Object.values(w.notes)) {
      if (other.id === id || !other.body.includes("[[")) continue;
      const body = renameLinks(other.body, old, next);
      if (body !== other.body) {
        other.body = body;
        other.updated = Date.now();
      }
    }
  });
}

export function deleteNote(id: string) {
  const snap = ws().notes[id];
  if (!snap) return;
  mut((w) => {
    delete w.notes[id];
  });
  setUi((u) => {
    if (u.noteId === id) u.noteId = null;
  });
  toast("Anotação excluída", () => {
    mut((w) => {
      w.notes[id] = snap;
    });
    openNotes(id);
  });
}

const cleanPath = (p: string) =>
  p
    .split("/")
    .map((x) => x.trim())
    .filter(Boolean)
    .join("/");
export function addFolder(path: string) {
  const clean = cleanPath(path);
  if (!clean) return;
  mut((w) => {
    const list = w.settings.noteFolders ?? [];
    if (!list.includes(clean)) w.settings.noteFolders = [...list, clean];
  });
}
export function renameFolder(from: string, to: string) {
  const dest = cleanPath(to);
  if (!dest || dest === from) return;
  const swap = (f: string) => (f === from ? dest : f.startsWith(from + "/") ? dest + f.slice(from.length) : f);
  mut((w) => {
    for (const n of Object.values(w.notes)) {
      const f = swap(n.folder);
      if (f !== n.folder) {
        n.folder = f;
        n.updated = Date.now();
      }
    }
    w.settings.noteFolders = (w.settings.noteFolders ?? []).map(swap);
  });
}
export function deleteFolder(path: string) {
  const inside = (f: string) => f === path || f.startsWith(path + "/");
  const before = ws();
  const notes = Object.values(before.notes).filter((n) => inside(n.folder));
  const folders = before.settings.noteFolders ?? [];
  mut((w) => {
    for (const n of notes) delete w.notes[n.id];
    w.settings.noteFolders = folders.filter((f) => !inside(f));
  });
  toast(notes.length ? `Pasta excluída com ${notes.length} ${notes.length === 1 ? "nota" : "notas"}` : "Pasta excluída", () =>
    mut((w) => {
      for (const n of notes) w.notes[n.id] = n;
      w.settings.noteFolders = folders;
    }),
  );
}
export function openDailyNote() {
  const t = today();
  const found = Object.values(ws().notes).find((n) => n.folder === "Diário" && n.title === t);
  if (found) openNotes(found.id);
  else createNote({ title: t, folder: "Diário", body: dailyBody(ws(), t) });
}
