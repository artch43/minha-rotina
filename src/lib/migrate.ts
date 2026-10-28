import type { Block, Color, Database, Item, Note, Page, Prop, Workspace } from "./types";
import { FIXED_PROPS } from "./types";
import { DEFAULT_SETTINGS } from "./template";
import { today, uid } from "./util";

const FIXED = new Set<string>(FIXED_PROPS);
const DEFAULT_AREA_BY_DB: Record<string, string> = { estudos: "estudos", trabalho: "profissional", compromissos: "pessoal" };

/** Turns old editor blocks into Markdown text. */
export function blocksToMarkdown(blocks: Block[] = []): string {
  let n = 0;
  return blocks
    .map((b) => {
      n = b.type === "ol" ? n + 1 : 0;
      switch (b.type) {
        case "h1":
          return "# " + b.text;
        case "h2":
          return "## " + b.text;
        case "h3":
          return "### " + b.text;
        case "ul":
          return "- " + b.text;
        case "ol":
          return `${n}. ${b.text}`;
        case "todo":
          return `- [${b.checked ? "x" : " "}] ${b.text}`;
        case "quote":
          return "> " + b.text;
        case "callout":
          return "> 💡 " + b.text;
        case "divider":
          return "---";
        default:
          return b.text;
      }
    })
    .join("\n")
    .trim();
}

/** Adds a tag option by name (reusing an existing one) and returns its id. */
function tagId(tags: Prop, name: string, color: Color = "gray") {
  tags.options ??= [];
  let o = tags.options.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!o) {
    o = { id: uid(), name, color };
    tags.options.push(o);
  }
  return o.id;
}

function migrateDb(id: string, db: Database, items: Item[]) {
  let tags = db.props.find((p) => p.id === "tags");
  if (!tags) {
    tags = { id: "tags", name: "Etiquetas", type: "multi", options: [] };
    db.props.push(tags);
  }
  const extra = db.props.filter((p) => !FIXED.has(p.id));
  for (const it of items) {
    const lines: string[] = [];
    for (const p of extra) {
      const v = it.props[p.id];
      if (v == null || v === "" || (Array.isArray(v) && !v.length)) continue;
      if (p.options) {
        const ids = Array.isArray(v) ? v : [String(v)];
        for (const oid of ids) {
          const o = p.options.find((x) => x.id === oid);
          if (o) it.props.tags = [...new Set([...((it.props.tags as string[]) ?? []), tagId(tags, o.name, o.color)])];
        }
      } else if (p.type === "checkbox") {
        if (v) it.props.tags = [...new Set([...((it.props.tags as string[]) ?? []), tagId(tags, p.name)])];
      } else lines.push(`${p.name}: ${v}`);
      delete it.props[p.id];
    }
    if (lines.length) it.notes = [lines.join("\n"), it.notes].filter(Boolean).join("\n\n");
  }
  db.props = db.props.filter((p) => FIXED.has(p.id));
  db.views = db.views.map((v) => ({
    ...v,
    type: v.type === ("list" as never) ? "table" : v.type,
    hidden: (v.hidden ?? []).filter((h) => FIXED.has(h)),
    filters: (v.filters ?? []).filter((f) => FIXED.has(f.prop)),
  }));
  if (!db.views.some((v) => v.type === "calendar"))
    db.views.push({ id: uid(), name: "Calendário", type: "calendar", filters: [], hidden: [] });
  db.defaultArea ??= DEFAULT_AREA_BY_DB[id];
}

/**
 * Brings any saved workspace up to the current format (version 2) without losing data:
 * block pages become notes, extra properties become tags or task notes, and areas,
 * events and the Calendar page are added. Safe to run on already-migrated data.
 */
export function normalizeWorkspace(input: Workspace): Workspace {
  const w = structuredClone(input) as Workspace & { docs?: Record<string, Block[]> };
  w.notes ??= {};
  w.events ??= {};
  w.todos ??= {};
  w.items ??= {};
  w.habits ??= [];
  w.habitLog ??= {};
  const s = (w.settings ?? {}) as Partial<typeof DEFAULT_SETTINGS> & Record<string, unknown>;
  w.settings = {
    theme: s.theme ?? DEFAULT_SETTINGS.theme,
    start: s.start ?? DEFAULT_SETTINGS.start,
    name: s.name ?? "",
    areas: s.areas?.length ? s.areas : DEFAULT_SETTINGS.areas.map((a) => ({ ...a })),
    emailAlerts: s.emailAlerts ?? DEFAULT_SETTINGS.emailAlerts,
    defaultAlerts: s.defaultAlerts ?? DEFAULT_SETTINGS.defaultAlerts,
    noteFolders: s.noteFolders ?? [],
  };

  // Block pages → notes (children of a removed page move up to the top level).
  const docPages = w.pages.filter((p) => (p.type as string) === "doc");
  for (const p of docPages) {
    const blocks = w.docs?.[p.id] ?? [];
    const id = p.id === "guia" ? "guia" : p.id;
    if (!w.notes[id]) {
      const note: Note = {
        id,
        title: p.title || "Sem título",
        folder: "",
        body: blocksToMarkdown(blocks),
        created: Date.now(),
        updated: Date.now(),
      };
      w.notes[id] = note;
    }
  }
  const removed = new Set(docPages.map((p) => p.id));
  w.pages = w.pages
    .filter((p) => !removed.has(p.id))
    .map((p): Page => (p.parent && removed.has(p.parent) ? { ...p, parent: null } : p));
  delete w.docs;

  // The To-do page is gone: quick to-dos now live on Início, as today's tasks.
  w.pages = w.pages.filter((p) => (p.type as string) !== "todo");
  for (const t of Object.values(w.todos)) if (!t.done && !t.date) t.date = today();
  if (!w.pages.some((p) => p.type === "calendar")) {
    for (const p of w.pages) if (p.order >= 1) p.order += 1;
    w.pages.push({ id: "calendario", title: "Calendário", icon: "🗓️", type: "calendar", parent: null, order: 1 });
  }

  // Tasks: notes as text, an area, only the fixed fields.
  for (const it of Object.values(w.items)) {
    if (typeof it.notes !== "string") it.notes = blocksToMarkdown(it.blocks);
    delete it.blocks;
  }
  for (const [id, db] of Object.entries(w.dbs))
    migrateDb(
      id,
      db,
      Object.values(w.items).filter((i) => i.db === id),
    );
  const areaIds = new Set(w.settings.areas.map((a) => a.id));
  for (const it of Object.values(w.items)) {
    if (!it.area || !areaIds.has(it.area)) {
      const def = w.dbs[it.db]?.defaultArea;
      it.area = def && areaIds.has(def) ? def : undefined;
    }
  }

  w.version = 2;
  return w;
}
