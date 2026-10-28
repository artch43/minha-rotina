import { describe, expect, it } from "vitest";
import { blocksToMarkdown, normalizeWorkspace } from "./migrate";
import type { Workspace } from "./types";

/** A workspace saved by version 1 of the app (block pages, extra properties, list view). */
function v1(): Workspace {
  return {
    version: 1,
    pages: [
      { id: "home", title: "Início", icon: "🏠", type: "home", parent: null, order: 0 },
      { id: "estudos", title: "Estudos", icon: "📚", type: "db", parent: null, order: 1 },
      { id: "guia", title: "Guia rápido", icon: "💡", type: "doc", parent: null, order: 2 },
      { id: "sub", title: "Sub", icon: "📝", type: "db", parent: "guia", order: 1 },
    ],
    dbs: {
      estudos: {
        srs: true,
        props: [
          {
            id: "status",
            name: "Status",
            type: "status",
            options: [{ id: "s1", name: "Não comecei", color: "gray", group: "todo" }],
          },
          { id: "date", name: "Data", type: "date" },
          { id: "subj", name: "Matéria", type: "select", options: [{ id: "m1", name: "Matemática", color: "blue" }] },
          { id: "place", name: "Local", type: "text" },
          { id: "tags", name: "Etiquetas", type: "multi", options: [] },
        ],
        views: [{ id: "v1", name: "Lista", type: "list", filters: [{ prop: "subj", op: "is", val: "m1" }], hidden: ["subj"] }],
      },
      sub: { srs: false, props: [], views: [] },
    },
    items: {
      a: {
        id: "a",
        db: "estudos",
        title: "Funções",
        created: 1,
        updated: 1,
        order: 1,
        log: [],
        props: { status: "s1", subj: "m1", place: "Biblioteca" },
        blocks: [
          { id: "b1", type: "h2", text: "Resumo" },
          { id: "b2", type: "todo", text: "Exercícios", checked: true },
        ],
      },
    },
    docs: {
      guia: [
        { id: "x", type: "h1", text: "Olá" },
        { id: "y", type: "ul", text: "item" },
      ],
    },
    notes: {},
    habits: [],
    habitLog: {},
    settings: { theme: "dark", start: "home", name: "Ana" },
  } as unknown as Workspace;
}

describe("migração para a versão 2", () => {
  it("converte blocos em Markdown", () => {
    expect(
      blocksToMarkdown([
        { id: "1", type: "h1", text: "T" },
        { id: "2", type: "ol", text: "a" },
        { id: "3", type: "ol", text: "b" },
        { id: "4", type: "todo", text: "c", checked: false },
        { id: "5", type: "divider", text: "" },
      ]),
    ).toBe("# T\n1. a\n2. b\n- [ ] c\n---");
  });

  it("transforma páginas de texto em notas e sobe as subpáginas", () => {
    const w = normalizeWorkspace(v1());
    expect(w.pages.some((p) => p.id === "guia")).toBe(false);
    expect(w.notes.guia).toMatchObject({ title: "Guia rápido", body: "# Olá\n- item" });
    expect(w.pages.find((p) => p.id === "sub")!.parent).toBeNull();
    expect("docs" in w).toBe(false);
  });

  it("mantém todos os itens e converte propriedades extras", () => {
    const w = normalizeWorkspace(v1());
    const it = w.items.a;
    expect(Object.keys(w.items)).toEqual(["a"]);
    const tags = w.dbs.estudos.props.find((p) => p.id === "tags")!.options!;
    expect((it.props.tags as string[]).map((id) => tags.find((o) => o.id === id)!.name)).toEqual(["Matemática"]);
    expect(it.notes).toBe("Local: Biblioteca\n\n## Resumo\n- [x] Exercícios");
    expect(it.props.subj).toBeUndefined();
    expect(w.dbs.estudos.props.map((p) => p.id)).toEqual(["status", "date", "tags"]);
  });

  it("troca a visão Lista por Tabela, limpa filtros antigos e acrescenta o calendário", () => {
    const views = normalizeWorkspace(v1()).dbs.estudos.views;
    expect(views.map((v) => v.type)).toEqual(["table", "calendar"]);
    expect(views[0].filters).toEqual([]);
    expect(views[0].hidden).toEqual([]);
  });

  it("acrescenta áreas, eventos e a página Calendário, mantendo as preferências", () => {
    const w = normalizeWorkspace(v1());
    expect(w.version).toBe(2);
    expect(w.settings).toMatchObject({ theme: "dark", name: "Ana" });
    expect(w.settings.areas.map((a) => a.id)).toEqual(["pessoal", "profissional", "estudos"]);
    expect(w.items.a.area).toBe("estudos");
    expect(w.events).toEqual({});
    expect(w.pages.find((p) => p.type === "calendar")).toBeTruthy();
  });

  it("pode rodar de novo sem mudar nada", () => {
    const once = normalizeWorkspace(v1());
    const twice = normalizeWorkspace(once);
    expect(twice.items).toEqual(once.items);
    expect(twice.pages).toEqual(once.pages);
    expect(twice.dbs).toEqual(once.dbs);
  });
});
