import { describe, expect, it } from "vitest";
import { blocksToMarkdown, normalizeWorkspace } from "./migrate";
import { today } from "./util";
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

  it("tira a página To-do e leva os afazeres pendentes sem data para hoje", () => {
    const w = v1();
    w.pages.push({ id: "todo", title: "To-do", icon: "✅", type: "todo" as never, parent: null, order: 1.5 });
    w.todos = {
      a: { id: "a", text: "Sem data", done: false, order: 1, created: 1 },
      b: { id: "b", text: "Feito sem data", done: true, order: 2, created: 1 },
      c: { id: "c", text: "Amanhã", done: false, order: 3, created: 1, date: "2099-01-01" },
    };
    const out = normalizeWorkspace(w);
    expect(out.pages.some((p) => (p.type as string) === "todo")).toBe(false);
    expect(Object.keys(out.todos)).toEqual(["a", "b", "c"]);
    expect(out.todos.a.date).toBe(today());
    expect(out.todos.b.date).toBeUndefined();
    expect(out.todos.c.date).toBe("2099-01-01");
  });
});

describe("dados salvos pela versão atual", () => {
  it("mantém pastas das listas, ícones e WhatsApp ao recarregar", async () => {
    const { template } = await import("./template");
    const w = template();
    w.settings.boardFolders = ["Casa", "Casa/Obras"];
    w.settings.boardFolderIcons = { Casa: "lucide:house" };
    w.settings.whatsapp = "+5511987654321";
    const out = normalizeWorkspace(w);
    expect(out.settings.boardFolders).toEqual(["Casa", "Casa/Obras"]);
    expect(out.settings.boardFolderIcons).toEqual({ Casa: "lucide:house" });
    expect(out.settings.whatsapp).toBe("+5511987654321");
  });

  it("tira filtros repetidos", async () => {
    const { template } = await import("./template");
    const w = template();
    const f = { prop: "status", op: "is" as const, val: "x" };
    w.dbs.estudos.views[0].filters = [f, { ...f }, { ...f, val: "y" }];
    expect(normalizeWorkspace(w).dbs.estudos.views[0].filters).toEqual([f, { ...f, val: "y" }]);
  });

  it("troca o guia rápido antigo sem edição e preserva o editado", async () => {
    const { template, OLD_GUIDE_BODIES, GUIDE_BODY } = await import("./template");
    const a = template();
    const guide = Object.values(a.notes).find((n) => n.title === "Guia rápido")!;
    guide.body = OLD_GUIDE_BODIES[0];
    delete a.settings.guideVersion;
    const outA = normalizeWorkspace(a);
    expect(outA.notes[guide.id].body).toBe(GUIDE_BODY);
    expect(Object.values(outA.notes).filter((n) => n.title.startsWith("Guia rápido"))).toHaveLength(1);

    const b = template();
    const g2 = Object.values(b.notes).find((n) => n.title === "Guia rápido")!;
    g2.body = "Minhas anotações sobre o site";
    delete b.settings.guideVersion;
    const outB = normalizeWorkspace(b);
    expect(outB.notes[g2.id].body).toBe("Minhas anotações sobre o site");
    expect(Object.values(outB.notes).some((n) => n.title === "Guia rápido (novo)" && n.body === GUIDE_BODY)).toBe(true);
    // Only once.
    expect(Object.values(normalizeWorkspace(outB).notes).filter((n) => n.title === "Guia rápido (novo)")).toHaveLength(1);
  });
});
