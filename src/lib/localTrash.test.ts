import { beforeAll, describe, expect, it } from "vitest";

const store: Record<string, string> = {};
beforeAll(() => {
  globalThis.localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => void (store[k] = v),
    removeItem: (k: string) => void delete store[k],
    clear: () => {},
    key: () => null,
    length: 0,
  } as Storage;
});

describe("lixeira sem conta (neste aparelho)", () => {
  it("guarda o que foi excluído, restaura e esquece o que voltou", async () => {
    const { useStore, deleteItem, deletePage } = await import("../store");
    const { installLocalTrash, loadTrash, restoreRows, deleteForever, LOCAL_TRASH_KEY } = await import("./sync");
    const stop = installLocalTrash();
    const ws = () => useStore.getState().ws;
    const task = Object.values(ws().items)[0];

    deleteItem(task.id);
    let t = await loadTrash();
    expect(t.local).toBe(true);
    expect(t.rows.find((r) => r.id === task.id)?.kind).toBe("item");

    restoreRows(t.rows.filter((r) => r.id === task.id));
    expect(ws().items[task.id]).toBeTruthy();
    t = await loadTrash();
    expect(t.rows.some((r) => r.id === task.id)).toBe(false);

    // A whole list: the page, its board and its tasks go in together.
    const n = Object.values(ws().items).filter((i) => i.db === "trabalho").length;
    deletePage("trabalho");
    t = await loadTrash();
    expect(t.rows.filter((r) => r.kind === "item").length).toBe(n);
    expect(t.rows.some((r) => r.kind === "page" && r.id === "trabalho")).toBe(true);
    expect(t.rows.some((r) => r.kind === "db" && r.id === "trabalho")).toBe(true);

    await deleteForever(t.rows.filter((r) => r.id === "trabalho"));
    t = await loadTrash();
    expect(t.rows.some((r) => r.id === "trabalho")).toBe(false);

    // Older than 30 days: dropped.
    store[LOCAL_TRASH_KEY] = JSON.stringify([{ kind: "note", id: "velha", data: {}, deleted_at: "2000-01-01T00:00:00Z" }]);
    expect((await loadTrash()).rows.some((r) => r.id === "velha")).toBe(false);
    stop();
  });
});
