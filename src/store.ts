import type { ReactNode } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Workspace, PropValue, PageType, Item } from "./lib/types";
import { template, mkDb, DEFAULT_STATUS } from "./lib/template";
import { applyStatusChange, descendants, childrenOf, runReviews, statusProp } from "./lib/model";
import { uid } from "./lib/util";
import { STORAGE_KEY, workspaceStorage } from "./lib/storage";

export interface UI {
  route: string;
  peek: string | null;
  peekFocus: boolean;
  collapsed: Record<string, boolean>;
  viewByDb: Record<string, string>;
  calMonth: Record<string, string>;
  search: Record<string, string>;
  sideOpen: boolean;
  modal: "search" | "settings" | null;
  toast: string | null;
}
interface Store {
  ws: Workspace;
  ui: UI;
  mut: (fn: (ws: Workspace) => void) => void;
  setUi: (fn: (ui: UI) => void) => void;
}

const defaultUi: UI = {
  route: "home", peek: null, peekFocus: false, collapsed: {}, viewByDb: {}, calMonth: {}, search: {},
  sideOpen: false, modal: null, toast: null,
};

export const useStore = create<Store>()(
  persist(
    immer((set) => ({
      ws: template(),
      ui: defaultUi,
      mut: (fn) => set((s) => { fn(s.ws); }),
      setUi: (fn) => set((s) => { fn(s.ui); }),
    })),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: workspaceStorage,
      partialize: (s) => ({ ws: s.ws, ui: { collapsed: s.ui.collapsed, viewByDb: s.ui.viewByDb } }) as unknown as Store,
      merge: (persisted, current) => {
        const p = persisted as Partial<Store> | undefined;
        return { ...current, ws: p?.ws ?? current.ws, ui: { ...current.ui, ...(p?.ui ?? {}) } };
      },
    },
  ),
);

/* ---------- popovers live outside the persisted store (they hold React nodes) ---------- */
interface PopState { pop: { anchor: HTMLElement; node: ReactNode; id: number } | null }
export const usePop = create<PopState>(() => ({ pop: null }));
export const openPop = (anchor: HTMLElement, node: ReactNode) => usePop.setState({ pop: { anchor, node, id: Date.now() } });
export const closePop = () => usePop.setState({ pop: null });

/* ---------- actions ---------- */
const mut = (fn: (ws: Workspace) => void) => useStore.getState().mut(fn);
const setUi = (fn: (ui: UI) => void) => useStore.getState().setUi(fn);
const ws = () => useStore.getState().ws;

let toastTimer: number | undefined;
export function toast(msg: string) {
  setUi((u) => { u.toast = msg; });
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => setUi((u) => { u.toast = null; }), 2600);
}

export function go(id: string) {
  closePop();
  setUi((u) => { u.route = id; u.peek = null; u.sideOpen = false; });
  if (location.hash !== "#/" + id) history.pushState(null, "", "#/" + id);
  document.querySelector(".scroll")?.scrollTo(0, 0);
}
export function openPeek(id: string, focus = false) {
  closePop();
  setUi((u) => { u.peek = id; u.peekFocus = focus; });
}
export const closePeek = () => setUi((u) => { u.peek = null; });

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
  mut((w) => { const it = w.items[itemId]; if (it) { fn(it); it.updated = Date.now(); } });
}
export function newItem(dbId: string, props: Record<string, PropValue> = {}) {
  const id = uid();
  mut((w) => {
    const db = w.dbs[dbId];
    const sp = statusProp(db);
    const it: Item = { id, db: dbId, title: "", props: {}, blocks: [], created: Date.now(), updated: Date.now(), order: Date.now(), log: [] };
    if (sp?.options?.[0]) it.props[sp.id] = sp.options[0].id;
    Object.assign(it.props, props);
    w.items[id] = it;
  });
  return id;
}
export function deleteItem(id: string) {
  mut((w) => { delete w.items[id]; });
  setUi((u) => { if (u.peek === id) u.peek = null; });
  toast("Item excluído");
}

export function addPage(type: PageType, parent: string | null = null) {
  const id = uid();
  mut((w) => {
    const sib = childrenOf(w, parent);
    w.pages.push({ id, title: "", icon: type === "db" ? "🗂️" : "📝", type, parent, order: (sib.length ? sib[sib.length - 1].order : 0) + 1 });
    if (type === "db") w.dbs[id] = mkDb(DEFAULT_STATUS);
    if (type === "doc") w.docs[id] = [];
  });
  if (parent) setUi((u) => { u.collapsed[parent] = false; });
  go(id);
}
export function deletePage(id: string) {
  const ids = [id, ...descendants(ws(), id)];
  mut((w) => {
    for (const pid of ids) {
      for (const it of Object.values(w.items)) if (it.db === pid) delete w.items[it.id];
      delete w.dbs[pid];
      delete w.docs[pid];
    }
    w.pages = w.pages.filter((p) => !ids.includes(p.id));
  });
  if (ids.includes(useStore.getState().ui.route)) go("home");
  toast("Página excluída");
}
export function movePage(id: string, targetId: string, mode: "before" | "after" | "in") {
  if (id === targetId || descendants(ws(), id).includes(targetId)) return;
  mut((w) => {
    const pg = w.pages.find((p) => p.id === id), tg = w.pages.find((p) => p.id === targetId);
    if (!pg || !tg) return;
    if (mode === "in") {
      const kids = childrenOf(w, tg.id).filter((x) => x.id !== id);
      pg.parent = tg.id;
      pg.order = (kids.length ? kids[kids.length - 1].order : 0) + 1;
    } else {
      pg.parent = tg.parent || null;
      const sib = childrenOf(w, pg.parent).filter((x) => x.id !== id);
      const idx = sib.findIndex((x) => x.id === tg.id) + (mode === "after" ? 1 : 0);
      sib.splice(idx, 0, pg);
      sib.forEach((x, i) => { x.order = i + 1; });
    }
  });
  if (mode === "in") setUi((u) => { u.collapsed[targetId] = false; });
}

export function toggleHabit(hid: string, day: string) {
  mut((w) => {
    const cur = w.habitLog[day] || [];
    const next = cur.includes(hid) ? cur.filter((x) => x !== hid) : [...cur, hid];
    if (next.length) w.habitLog[day] = next; else delete w.habitLog[day];
  });
}
export const checkReviews = () => mut(runReviews);
