import type { Block, Color, Database, Group, Item, Option, Prop, Workspace } from "./types";
import { addDays, today, uid } from "./util";

export const opts = (list: [string, Color, Group?][]): Option[] =>
  list.map(([name, color, group]) => ({ id: uid(), name, color, ...(group ? { group } : {}) }));

export const DEFAULT_STATUS: [string, Color, Group][] = [
  ["Não comecei", "gray", "todo"],
  ["Fazendo", "blue", "doing"],
  ["Feito", "green", "done"],
  ["Revisar", "orange", "review"],
];

export function mkDb(status: [string, Color, Group][], extra: Prop[] = [], srs = false): Database {
  return {
    srs,
    props: [
      { id: "status", name: "Status", type: "status", options: opts(status) },
      { id: "date", name: "Data", type: "date" },
      {
        id: "prio",
        name: "Prioridade",
        type: "select",
        options: opts([
          ["Alta", "red"],
          ["Média", "yellow"],
          ["Baixa", "gray"],
        ]),
      },
      ...extra,
      { id: "tags", name: "Etiquetas", type: "multi", options: opts([["Exemplo", "gray"]]) },
    ],
    views: [
      { id: uid(), name: "Quadro", type: "board", filters: [], hidden: [] },
      { id: uid(), name: "Tabela", type: "table", filters: [], hidden: [], widths: {} },
      { id: uid(), name: "Lista", type: "list", filters: [], hidden: [] },
      { id: uid(), name: "Calendário", type: "calendar", filters: [], hidden: [] },
    ],
  };
}

const b = (type: Block["type"], text: string, extra: Partial<Block> = {}): Block => ({ id: uid(), type, text, ...extra });

/** Starting workspace for a new person. Items tagged "Exemplo" are safe to delete. */
export function template(): Workspace {
  const T = today();
  const E = "estudos",
    W = "trabalho",
    C = "compromissos",
    G = "guia";
  const N1 = uid(),
    N2 = uid();
  const dbE = mkDb(
    [
      ["Não comecei", "gray", "todo"],
      ["Estudando", "blue", "doing"],
      ["Estudado", "green", "done"],
      ["Revisar", "orange", "review"],
    ],
    [
      {
        id: "subj",
        name: "Matéria",
        type: "select",
        options: opts([
          ["Matemática", "blue"],
          ["Português", "orange"],
          ["História", "brown"],
          ["Biologia", "green"],
        ]),
      },
    ],
    true,
  );
  const dbW = mkDb(DEFAULT_STATUS, [
    {
      id: "proj",
      name: "Projeto",
      type: "select",
      options: opts([
        ["Relatórios", "purple"],
        ["Clientes", "pink"],
      ]),
    },
  ]);
  const dbC = mkDb(
    [
      ["Agendado", "blue", "todo"],
      ["Feito", "green", "done"],
      ["Remarcar", "red", "review"],
    ],
    [{ id: "place", name: "Local", type: "text" }],
  );
  dbC.props = dbC.props.filter((p) => p.id !== "prio");

  const st = (db: Database, i: number) => db.props[0].options![i].id;
  const opt = (db: Database, pid: string, i: number) => db.props.find((p) => p.id === pid)!.options![i].id;
  let n = 0;
  const item = (dbId: string, db: Database, title: string, props: Item["props"], extra: Partial<Item> = {}): Item => ({
    id: uid(),
    db: dbId,
    title,
    props: { tags: [opt(db, "tags", 0)], ...props },
    blocks: [],
    created: Date.now() + n,
    updated: Date.now(),
    order: ++n,
    log: [],
    ...extra,
  });
  const items = [
    item(
      E,
      dbE,
      "Funções do 2º grau",
      { status: st(dbE, 1), subj: opt(dbE, "subj", 0), date: T, prio: opt(dbE, "prio", 0) },
      {
        blocks: [
          b("h2", "Resumo"),
          b("ul", "Forma geral: f(x) = ax² + bx + c"),
          b("ul", "Vértice: x = −b / 2a"),
          b("todo", "Fazer 10 exercícios da lista", { checked: false }),
        ],
      },
    ),
    item(E, dbE, "Revolução Francesa", { status: st(dbE, 0), subj: opt(dbE, "subj", 2), date: addDays(T, 2) }),
    item(
      E,
      dbE,
      "Concordância verbal",
      { status: st(dbE, 2), subj: opt(dbE, "subj", 1) },
      { review: { stage: 0, next: addDays(T, 1) } },
    ),
    item(E, dbE, "Logaritmos", { status: st(dbE, 3), subj: opt(dbE, "subj", 0) }, { review: { stage: 1, next: T } }),
    item(W, dbW, "Relatório mensal", {
      status: st(dbW, 1),
      date: addDays(T, 2),
      prio: opt(dbW, "prio", 0),
      proj: opt(dbW, "proj", 0),
    }),
    item(W, dbW, "Responder e-mails do cliente", { status: st(dbW, 0), date: T, proj: opt(dbW, "proj", 1) }),
    item(C, dbC, "Dentista", { status: st(dbC, 0), date: addDays(T, 1) + " 15:00", place: "Clínica do bairro" }),
  ];

  return {
    version: 1,
    pages: [
      { id: "home", title: "Início", icon: "🏠", type: "home", parent: null, order: 0 },
      { id: E, title: "Estudos", icon: "📚", type: "db", parent: null, order: 1, cover: "grid", fav: true },
      { id: W, title: "Trabalho", icon: "💼", type: "db", parent: null, order: 2 },
      { id: C, title: "Compromissos", icon: "📅", type: "db", parent: null, order: 3 },
      { id: "habits", title: "Hábitos", icon: "🌱", type: "habits", parent: null, order: 4 },
      { id: G, title: "Guia rápido", icon: "💡", type: "doc", parent: null, order: 5 },
    ],
    dbs: { [E]: dbE, [W]: dbW, [C]: dbC },
    items: Object.fromEntries(items.map((i) => [i.id, i])),
    docs: {
      [G]: [
        b("callout", "Bem-vindo! Este espaço é só seu. Tudo o que você escreve fica salvo neste navegador."),
        b("h2", "Como organizar"),
        b("ul", "Cada página da barra lateral pode ser um texto (como esta) ou um banco de dados (como Estudos)."),
        b("ul", "Nos bancos, alterne entre Quadro, Tabela, Lista e Calendário. Arraste os cartões entre as colunas de status."),
        b("ul", "Ao marcar um estudo como “Estudado”, as revisões são agendadas para 1, 7 e 30 dias depois."),
        b("h2", "Atalhos"),
        b("ul", "Digite / numa linha vazia para escolher o tipo de bloco."),
        b("ul", "Comece a linha com #, ##, -, 1., [] ou > para formatar."),
        b("ul", "Ctrl/Cmd + K abre a busca."),
        b("todo", "Apagar os itens de exemplo quando terminar de explorar", { checked: false }),
      ],
    },
    notes: {
      [N1]: {
        id: N1,
        folder: "",
        title: "Como usar as anotações",
        created: Date.now(),
        updated: Date.now(),
        body: [
          "Escreva em **Markdown**: `#` para títulos, `-` para listas, `**negrito**` e `*itálico*`.",
          "",
          "## Ligue suas ideias",
          "- Digite `[[` e escolha uma nota para criar um link, como [[Ideias]].",
          "- Se a nota ainda não existir, clicar no link cria a nota.",
          "- No painel à direita aparecem as **menções**: as notas que apontam para esta.",
          "",
          "## Organize",
          "- Use pastas no painel da esquerda e #tags no texto, como #exemplo.",
          "- O botão **Nota do dia** abre um diário com o que está marcado para hoje.",
          "- O **Grafo** mostra como as notas se conectam.",
          "",
        ].join("\n"),
      },
      [N2]: {
        id: N2,
        folder: "",
        title: "Ideias",
        created: Date.now(),
        updated: Date.now(),
        body: "- Anote aqui o que vier à cabeça. Volte para [[Como usar as anotações]].\n\n#exemplo\n",
      },
    },
    habits: [
      { id: uid(), name: "Ler 20 minutos", icon: "📖" },
      { id: uid(), name: "Exercício", icon: "🏃" },
      { id: uid(), name: "Beber 2 L de água", icon: "💧" },
    ],
    habitLog: {},
    settings: { theme: "system", accent: "ink", font: "sans", width: "normal", density: "comfy", start: "home", name: "" },
  };
}
