import type { Note, Workspace } from "./types";
import { dateOf, groupOf } from "./model";
import { today } from "./util";

const WIKI = /\[\[([^\]\n]+?)\]\]/g;

/** Splits a [[target#heading|alias]] link body into its parts. */
export function parseWiki(inner: string) {
  const [left, alias] = inner.split("|");
  const [target, heading] = left.split("#");
  return { target: target.trim(), heading: heading?.trim(), alias: alias?.trim() };
}

/** Removes fenced and inline code so links and tags inside code are ignored. */
export function stripCode(body: string) {
  return body.replace(/```[\s\S]*?(```|$)/g, "").replace(/`[^`\n]*`/g, "");
}

export function extractLinks(body: string): string[] {
  const out = new Set<string>();
  for (const m of stripCode(body).matchAll(WIKI)) {
    const t = parseWiki(m[1]).target;
    if (t) out.add(t);
  }
  return [...out];
}

export const TAG_RE = /(^|[\s(])#([\p{L}\p{N}_/-]*[\p{L}_/-][\p{L}\p{N}_/-]*)/gu;
export function extractTags(body: string): string[] {
  const out = new Set<string>();
  for (const m of stripCode(body).matchAll(TAG_RE)) out.add(m[2].toLowerCase());
  return [...out];
}

export function headings(body: string): { level: number; text: string; line: number }[] {
  const out: { level: number; text: string; line: number }[] = [];
  let inCode = false;
  body.split("\n").forEach((l, i) => {
    if (/^```/.test(l)) inCode = !inCode;
    const m = !inCode && /^(#{1,6})\s+(.+)$/.exec(l);
    if (m) out.push({ level: m[1].length, text: m[2].trim(), line: i });
  });
  return out;
}

const norm = (s: string) => s.trim().toLowerCase();
export const findByTitle = (notes: Record<string, Note>, title: string) =>
  Object.values(notes).find((n) => norm(n.title) === norm(title));

export function backlinks(notes: Record<string, Note>, note: Note) {
  return Object.values(notes)
    .filter((n) => n.id !== note.id && extractLinks(n.body).some((t) => norm(t) === norm(note.title)))
    .map((n) => ({ note: n, snippet: snippetAround(n.body, note.title) }));
}
function snippetAround(body: string, title: string) {
  const line = body.split("\n").find((l) => l.toLowerCase().includes("[[" + title.toLowerCase())) ?? "";
  return line
    .replace(WIKI, (_, inner) => {
      const p = parseWiki(inner);
      return p.alias || p.target;
    })
    .replace(/^[#>\-*\s]+/, "")
    .slice(0, 160);
}

/** Rewrites [[old]], [[old|alias]] and [[old#heading]] to point at the new title. */
export function renameLinks(body: string, oldTitle: string, newTitle: string) {
  return body.replace(WIKI, (whole, inner: string) => {
    const p = parseWiki(inner);
    if (norm(p.target) !== norm(oldTitle)) return whole;
    return "[[" + newTitle + (p.heading ? "#" + p.heading : "") + (p.alias ? "|" + p.alias : "") + "]]";
  });
}

export function uniqueTitle(notes: Record<string, Note>, base: string) {
  if (!findByTitle(notes, base)) return base;
  for (let i = 2; ; i++) if (!findByTitle(notes, `${base} ${i}`)) return `${base} ${i}`;
}

/** Folder paths (with every parent), from notes plus explicitly created empty folders. */
export function folderList(notes: Record<string, Note>, extra: string[] = []) {
  const out = new Set<string>();
  for (const f of [...Object.values(notes).map((n) => n.folder), ...extra]) {
    const parts = (f || "").split("/").filter(Boolean);
    parts.forEach((_, i) => out.add(parts.slice(0, i + 1).join("/")));
  }
  return [...out].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Starting text for today's journal note: what's due, reviews and habits. */
export function dailyBody(ws: Workspace, date = today()) {
  const d = new Date(date + "T12:00:00");
  const head = d
    .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/^./, (c) => c.toUpperCase());
  const lines: string[] = [];
  for (const it of Object.values(ws.items)) {
    const db = ws.dbs[it.db];
    if (!db) continue;
    const g = groupOf(db, it);
    const page = ws.pages.find((p) => p.id === it.db);
    const due = dateOf(db, it).slice(0, 10) === date && g !== "done";
    if (due || g === "review" || g === "doing")
      lines.push(`- [ ] ${it.title || "Sem título"}${g === "review" ? " (revisar)" : ""} · ${page?.title ?? ""}`);
  }
  const habits = ws.habits.map((h) => `- [ ] ${h.icon} ${h.name}`);
  return [
    `# ${head}`,
    "",
    "## Para hoje",
    ...(lines.length ? lines : ["- Nada marcado para hoje"]),
    "",
    "## Hábitos",
    ...habits,
    "",
    "## Anotações",
    "",
    "",
  ].join("\n");
}

export function safeFileName(s: string) {
  return (
    (s || "Sem título")
      .replace(/[\\/:*?"<>|#^[\]]/g, "-")
      .trim()
      .slice(0, 120) || "Sem título"
  );
}
