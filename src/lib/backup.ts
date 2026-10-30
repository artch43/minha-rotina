import type { Workspace } from "./types";
import { today } from "./util";
import { normalizeWorkspace } from "./migrate";

export { normalizeWorkspace };

export function downloadBackup(ws: Workspace) {
  const blob = new Blob([JSON.stringify({ app: "organizer", exportedAt: new Date().toISOString(), workspace: ws }, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `organizer-backup-${today()}.json`;
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
  if (
    !w ||
    (w.version as number) > 2 ||
    !w.version ||
    !Array.isArray(w.pages) ||
    typeof w.items !== "object" ||
    typeof w.dbs !== "object"
  ) {
    throw new Error("Este arquivo não é um backup do Organizer.");
  }
  return normalizeWorkspace(w as Workspace);
}
