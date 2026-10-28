import type { Area, CalendarEvent, Color, Database, Group, Item, Note, Option, Settings, Todo, Workspace } from "./types";
import { addDays, today, uid } from "./util";

export const opts = (list: [string, Color, Group?][]): Option[] =>
  list.map(([name, color, group]) => ({ id: uid(), name, color, ...(group ? { group } : {}) }));

export const DEFAULT_STATUS: [string, Color, Group][] = [
  ["Não comecei", "gray", "todo"],
  ["Fazendo", "blue", "doing"],
  ["Feito", "green", "done"],
  ["Revisar", "orange", "review"],
];

export const DEFAULT_AREAS: Area[] = [
  { id: "pessoal", name: "Pessoal", color: "coral" },
  { id: "profissional", name: "Profissional", color: "petrol" },
  { id: "estudos", name: "Estudos", color: "violet" },
];

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  start: "home",
  name: "",
  areas: DEFAULT_AREAS,
  emailAlerts: true,
  defaultAlerts: [30],
  noteFolders: [],
};

export function mkDb(
  status: [string, Color, Group][],
  defaultArea?: string,
  srs = false,
  tags: [string, Color][] = [],
): Database {
  return {
    srs,
    defaultArea,
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
      { id: "tags", name: "Etiquetas", type: "multi", options: opts([...tags, ["Exemplo", "gray"]]) },
    ],
    views: [
      { id: uid(), name: "Quadro", type: "board", filters: [], hidden: [] },
      { id: uid(), name: "Tabela", type: "table", filters: [], hidden: [], widths: {} },
      { id: uid(), name: "Calendário", type: "calendar", filters: [], hidden: [] },
    ],
  };
}

export const GUIDE_NOTE = (id = uid()): Note => ({
  id,
  folder: "",
  title: "Guia rápido",
  created: Date.now(),
  updated: Date.now(),
  body: [
    "Bem-vindo! Este espaço é só seu.",
    "",
    "## Tarefas",
    "- Cada banco (Estudos, Trabalho, Compromissos) tem um quadro com colunas de status. Arraste os cartões entre as colunas.",
    "- Clique no nome de uma coluna para renomeá-la.",
    "- Use o seletor de área no topo para ver só o que é Pessoal, Profissional ou Estudos.",
    "- Para coisas rápidas do dia, escreva no campo do Início e marque quando terminar.",
    "",
    "## Calendário",
    "- Crie eventos (inclusive repetidos, como aulas toda semana) e escolha quando quer ser avisado por e-mail.",
    "- As tarefas com data também aparecem lá.",
    "",
    "## Anotações",
    "- Escreva em Markdown e ligue notas com [[Nome da nota]].",
    "- Ctrl/Cmd + K abre a busca.",
    "- Ctrl + Delete (⌘ + ⌫ no Mac) apaga o item selecionado ou sob o mouse. Dá para desfazer logo em seguida.",
    "",
    "- [ ] Apagar os itens de exemplo quando terminar de explorar",
    "",
  ].join("\n"),
});

/** Starting workspace for a new person. Items tagged "Exemplo" are safe to delete. */
export function template(): Workspace {
  const T = today();
  const E = "estudos",
    W = "trabalho",
    C = "compromissos";
  const dbE = mkDb(
    [
      ["Não comecei", "gray", "todo"],
      ["Estudando", "blue", "doing"],
      ["Estudado", "green", "done"],
      ["Revisar", "orange", "review"],
    ],
    "estudos",
    true,
    [
      ["Matemática", "blue"],
      ["Português", "orange"],
      ["História", "brown"],
    ],
  );
  const dbW = mkDb(DEFAULT_STATUS, "profissional", false, [
    ["Relatórios", "purple"],
    ["Clientes", "pink"],
  ]);
  const dbC = mkDb(
    [
      ["Agendado", "blue", "todo"],
      ["Feito", "green", "done"],
      ["Remarcar", "red", "review"],
    ],
    "pessoal",
  );

  const st = (db: Database, i: number) => db.props[0].options![i].id;
  const opt = (db: Database, pid: string, name: string) =>
    db.props.find((p) => p.id === pid)!.options!.find((o) => o.name === name)!.id;
  let n = 0;
  const item = (dbId: string, db: Database, title: string, props: Item["props"], extra: Partial<Item> = {}): Item => ({
    id: uid(),
    db: dbId,
    title,
    area: db.defaultArea,
    notes: "",
    props: { ...props, tags: [...((props.tags as string[]) ?? []), opt(db, "tags", "Exemplo")] },
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
      { status: st(dbE, 1), tags: [opt(dbE, "tags", "Matemática")], date: T, prio: opt(dbE, "prio", "Alta") },
      { notes: "Forma geral: f(x) = ax² + bx + c\nVértice: x = −b / 2a\n\n- [ ] Fazer 10 exercícios da lista" },
    ),
    item(E, dbE, "Revolução Francesa", { status: st(dbE, 0), tags: [opt(dbE, "tags", "História")], date: addDays(T, 2) }),
    item(
      E,
      dbE,
      "Concordância verbal",
      { status: st(dbE, 2), tags: [opt(dbE, "tags", "Português")] },
      { review: { stage: 0, next: addDays(T, 1) } },
    ),
    item(E, dbE, "Logaritmos", { status: st(dbE, 3), tags: [opt(dbE, "tags", "Matemática")] }, { review: { stage: 1, next: T } }),
    item(W, dbW, "Relatório mensal", {
      status: st(dbW, 1),
      date: addDays(T, 2),
      prio: opt(dbW, "prio", "Alta"),
      tags: [opt(dbW, "tags", "Relatórios")],
    }),
    item(W, dbW, "Responder e-mails do cliente", { status: st(dbW, 0), date: T, tags: [opt(dbW, "tags", "Clientes")] }),
    item(C, dbC, "Dentista", { status: st(dbC, 0), date: addDays(T, 1) + " 15:00" }, { notes: "Clínica do bairro" }),
  ];
  const ev = (
    title: string,
    date: string,
    start: string,
    end: string,
    area: string,
    alerts: number[],
    location = "",
  ): CalendarEvent => ({
    id: uid(),
    title,
    date,
    allDay: false,
    start,
    end,
    area,
    location,
    notes: "",
    alerts,
    created: Date.now(),
    updated: Date.now(),
  });
  const events = [
    ev("Aula de inglês (exemplo)", addDays(T, 1), "19:00", "20:00", "estudos", [30]),
    ev("Reunião de equipe (exemplo)", addDays(T, 2), "10:00", "11:00", "profissional", [10, 60]),
  ];
  const todo = (text: string, k: number, extra: Partial<Todo> = {}): Todo => ({
    id: uid(),
    text,
    done: false,
    order: k,
    created: Date.now(),
    ...extra,
  });
  const todos = [
    todo("Comprar pão (exemplo)", 1, { date: T, area: "pessoal" }),
    todo("Mandar o relatório para a Ana (exemplo)", 2, { date: addDays(T, 1), area: "profissional" }),
    todo("Separar o material da prova (exemplo)", 3, { date: T, area: "estudos" }),
  ];
  const guide = GUIDE_NOTE();
  const ideas: Note = {
    id: uid(),
    folder: "",
    title: "Ideias",
    created: Date.now(),
    updated: Date.now(),
    body: "- Anote aqui o que vier à cabeça. Volte para o [[Guia rápido]].\n\n#exemplo\n",
  };

  return {
    version: 2,
    pages: [
      { id: "home", title: "Início", icon: "🏠", type: "home", parent: null, order: 0 },
      { id: "calendario", title: "Calendário", icon: "🗓️", type: "calendar", parent: null, order: 1 },
      { id: E, title: "Estudos", icon: "📚", type: "db", parent: null, order: 2, fav: true },
      { id: W, title: "Trabalho", icon: "💼", type: "db", parent: null, order: 3 },
      { id: C, title: "Compromissos", icon: "📅", type: "db", parent: null, order: 4 },
      { id: "habits", title: "Hábitos", icon: "🌱", type: "habits", parent: null, order: 5 },
    ],
    dbs: { [E]: dbE, [W]: dbW, [C]: dbC },
    items: Object.fromEntries(items.map((i) => [i.id, i])),
    events: Object.fromEntries(events.map((e) => [e.id, e])),
    todos: Object.fromEntries(todos.map((t) => [t.id, t])),
    notes: { [guide.id]: guide, [ideas.id]: ideas },
    habits: [
      { id: uid(), name: "Ler 20 minutos", icon: "📖" },
      { id: uid(), name: "Exercício", icon: "🏃" },
      { id: uid(), name: "Beber 2 L de água", icon: "💧" },
    ],
    habitLog: {},
    settings: { ...DEFAULT_SETTINGS, areas: DEFAULT_AREAS.map((a) => ({ ...a })) },
  };
}
