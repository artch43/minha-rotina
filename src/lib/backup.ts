import type { Workspace } from "./types";
import { today } from "./util";
import { template } from "./template";

export function downloadBackup(ws: Workspace) {
  const blob = new Blob([JSON.stringify({ app: "minha-rotina", exportedAt: new Date().toISOString(), workspace: ws }, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `minha-rotina-backup-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Reads a backup file and checks that it looks like a workspace. Throws a readable message otherwise. */
export function parseBackup(text: string): Workspace {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("O arquivo não é um JSON válido.");
  }
  const ws = (data as { workspace?: unknown })?.workspace ?? data;
  const w = ws as Partial<Workspace>;
  if (!w || w.version !== 1 || !Array.isArray(w.pages) || typeof w.items !== "object" || typeof w.dbs !== "object") {
    throw new Error("Este arquivo não é um backup do Minha Rotina.");
  }
  return normalizeWorkspace(w as Workspace);
}

/** Fills in fields added after a workspace was first saved, so old data keeps opening. */
export function normalizeWorkspace(w: Workspace): Workspace {
  const base = template();
  return {
    ...w,
    version: 1,
    docs: w.docs ?? {},
    notes: w.notes ?? {},
    habits: w.habits ?? [],
    habitLog: w.habitLog ?? {},
    settings: { ...base.settings, ...(w.settings ?? {}) },
  };
}
