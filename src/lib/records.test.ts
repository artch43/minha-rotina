import { describe, expect, it } from "vitest";
import { produce } from "immer";
import { applyRecords, diffEntities, fromRecords, toEntities, type Rec } from "./records";
import { template } from "./template";

const rowsOf = (ws: ReturnType<typeof template>): Rec[] =>
  [...toEntities(ws).values()].map((e) => ({ kind: e.kind, id: e.id, data: e.data }));

describe("registros na nuvem", () => {
  it("ida e volta: espaço → registros → espaço", () => {
    const ws = template();
    ws.habitLog = { "2026-10-01": [ws.habits[0].id], "2026-11-02": [ws.habits[1].id] };
    const back = fromRecords(rowsOf(ws), ws.settings);
    expect(back.pages.map((p) => p.id).sort()).toEqual(ws.pages.map((p) => p.id).sort());
    expect(back.items).toEqual(ws.items);
    expect(back.docs).toEqual(ws.docs);
    expect(back.habits.map((h) => h.name)).toEqual(ws.habits.map((h) => h.name));
    expect(back.habitLog).toEqual(ws.habitLog);
  });

  it("detecta só o que mudou (immer mantém o resto igual)", () => {
    const ws = template();
    const id = Object.keys(ws.items)[0];
    const next = produce(ws, (d) => {
      d.items[id].title = "Novo título";
    });
    const { changed, removed } = diffEntities(toEntities(ws), toEntities(next));
    expect(changed).toEqual(["item:" + id]);
    expect(removed).toEqual([]);
  });

  it("detecta remoções e mudanças em hábitos", () => {
    const ws = template();
    const id = Object.keys(ws.items)[0];
    const next = produce(ws, (d) => {
      delete d.items[id];
      d.habitLog["2026-10-27"] = [d.habits[0].id];
    });
    const { changed, removed } = diffEntities(toEntities(ws), toEntities(next));
    expect(removed).toEqual(["item:" + id]);
    expect(changed).toEqual(["habitlog:2026-10"]);
  });

  it("aplica exclusões vindas do servidor", () => {
    const ws = template();
    const id = Object.keys(ws.items)[0];
    applyRecords(ws, [
      { kind: "item", id, data: {}, deleted_at: "2026-10-27T10:00:00Z" },
      { kind: "page", id: "guia", data: {}, deleted_at: "2026-10-27T10:00:00Z" },
    ]);
    expect(ws.items[id]).toBeUndefined();
    expect(ws.pages.some((p) => p.id === "guia")).toBe(false);
  });
});

describe("eventos e afazeres na nuvem", () => {
  it("vão e voltam sem perder nada", () => {
    const ws = template();
    const back = fromRecords(rowsOf(ws), ws.settings);
    expect(back.events).toEqual(ws.events);
    expect(back.todos).toEqual(ws.todos);
  });
  it("detectam um afazer marcado como feito", () => {
    const ws = template();
    const id = Object.keys(ws.todos)[0];
    const next = produce(ws, (d) => {
      d.todos[id].done = true;
    });
    expect(diffEntities(toEntities(ws), toEntities(next)).changed).toEqual(["todo:" + id]);
  });
});
