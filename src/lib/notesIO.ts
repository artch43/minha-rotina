import type { Note } from "./types";
import { safeFileName, uniqueTitle } from "./notes";
import { today, uid } from "./util";

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** All notes as .md files in their folders, zipped. The zip opens as an Obsidian vault. */
export async function exportNotesZip(notes: Record<string, Note>) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const used = new Set<string>();
  for (const n of Object.values(notes)) {
    const dir = n.folder ? n.folder.split("/").map(safeFileName).join("/") + "/" : "";
    let path = dir + safeFileName(n.title) + ".md";
    for (let i = 2; used.has(path.toLowerCase()); i++) path = dir + safeFileName(n.title) + ` ${i}.md`;
    used.add(path.toLowerCase());
    zip.file(path, n.body);
  }
  download(await zip.generateAsync({ type: "blob" }), `minha-rotina-anotacoes-${today()}.zip`);
}

export function exportNoteMd(n: Note) {
  download(new Blob([n.body], { type: "text/markdown" }), safeFileName(n.title) + ".md");
}

/** Reads .md / .txt files picked by the person into new notes (not saved yet). */
export async function readMarkdownFiles(
  files: FileList | File[],
  existing: Record<string, Note>,
  folder: string,
): Promise<Note[]> {
  const out: Note[] = [];
  const all = { ...existing };
  for (const f of Array.from(files)) {
    if (!/\.(md|markdown|txt)$/i.test(f.name)) continue;
    const now = Date.now();
    const title = uniqueTitle(all, f.name.replace(/\.(md|markdown|txt)$/i, ""));
    const note: Note = { id: uid(), title, folder, body: await f.text(), created: now, updated: now };
    all[note.id] = note;
    out.push(note);
  }
  return out;
}
