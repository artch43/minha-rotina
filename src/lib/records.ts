import type { Block, Database, Habit, Item, Note, Page, Settings, Workspace } from "./types";

/**
 * The workspace is stored in the cloud as one row per entity. These pure helpers
 * convert between the in-memory Workspace and those rows, and find what changed.
 */
export type Kind = "page" | "db" | "item" | "doc" | "note" | "habit" | "habitlog" | "settings";
export interface Rec {
  kind: Kind;
  id: string;
  data: unknown;
  updated_at?: string;
  deleted_at?: string | null;
}
export interface Ent {
  kind: Kind;
  id: string;
  data: unknown;
  /** Identity used to detect changes: the object itself, or a string for entities built on the fly. */
  sig: unknown;
}

export const keyOf = (kind: Kind, id: string) => kind + ":" + id;

export function toEntities(ws: Workspace): Map<string, Ent> {
  const out = new Map<string, Ent>();
  const put = (kind: Kind, id: string, data: unknown, sig: unknown = data) => out.set(keyOf(kind, id), { kind, id, data, sig });
  for (const p of ws.pages) put("page", p.id, p);
  for (const id in ws.dbs) put("db", id, ws.dbs[id]);
  for (const id in ws.items) put("item", id, ws.items[id]);
  for (const id in ws.docs) put("doc", id, { blocks: ws.docs[id] }, ws.docs[id]);
  for (const id in ws.notes ?? {}) put("note", id, ws.notes[id]);
  ws.habits.forEach((h, i) => {
    const data = { ...h, order: i };
    put("habit", h.id, data, JSON.stringify(data));
  });
  const months: Record<string, Record<string, string[]>> = {};
  for (const day in ws.habitLog) (months[day.slice(0, 7)] ??= {})[day] = ws.habitLog[day];
  for (const m in months) {
    const data = { days: months[m] };
    put("habitlog", m, data, JSON.stringify(data));
  }
  put("settings", "main", ws.settings);
  return out;
}

export function diffEntities(prev: Map<string, Ent>, next: Map<string, Ent>) {
  const changed: string[] = [];
  const removed: string[] = [];
  for (const [k, e] of next) {
    const p = prev.get(k);
    if (!p || p.sig !== e.sig) changed.push(k);
  }
  for (const k of prev.keys()) if (!next.has(k)) removed.push(k);
  return { changed, removed };
}

/** Applies rows (from the server) onto a workspace. Works on immer drafts and plain objects. */
export function applyRecords(ws: Workspace, rows: Rec[]) {
  let habitsTouched = false;
  for (const r of rows) {
    const gone = !!r.deleted_at;
    switch (r.kind) {
      case "page": {
        const i = ws.pages.findIndex((p) => p.id === r.id);
        if (gone) {
          if (i >= 0) ws.pages.splice(i, 1);
        } else if (i >= 0) ws.pages[i] = r.data as Page;
        else ws.pages.push(r.data as Page);
        break;
      }
      case "db":
        if (gone) delete ws.dbs[r.id];
        else ws.dbs[r.id] = r.data as Database;
        break;
      case "item":
        if (gone) delete ws.items[r.id];
        else ws.items[r.id] = r.data as Item;
        break;
      case "doc":
        if (gone) delete ws.docs[r.id];
        else ws.docs[r.id] = (r.data as { blocks: Block[] }).blocks;
        break;
      case "note":
        ws.notes ??= {};
        if (gone) delete ws.notes[r.id];
        else ws.notes[r.id] = r.data as Note;
        break;
      case "habit": {
        habitsTouched = true;
        const i = ws.habits.findIndex((h) => h.id === r.id);
        if (gone) {
          if (i >= 0) ws.habits.splice(i, 1);
        } else if (i >= 0) ws.habits[i] = r.data as Habit;
        else ws.habits.push(r.data as Habit);
        break;
      }
      case "habitlog": {
        for (const day of Object.keys(ws.habitLog)) if (day.startsWith(r.id)) delete ws.habitLog[day];
        if (!gone) Object.assign(ws.habitLog, (r.data as { days: Record<string, string[]> }).days);
        break;
      }
      case "settings":
        if (!gone) ws.settings = r.data as Settings;
        break;
    }
  }
  if (habitsTouched) ws.habits.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Builds a whole workspace from the server's rows (ignoring deleted ones). */
export function fromRecords(rows: Rec[], fallbackSettings: Settings): Workspace {
  const ws: Workspace = {
    version: 1,
    pages: [],
    dbs: {},
    items: {},
    docs: {},
    notes: {},
    habits: [],
    habitLog: {},
    settings: fallbackSettings,
  };
  applyRecords(
    ws,
    rows.filter((r) => !r.deleted_at),
  );
  return ws;
}
