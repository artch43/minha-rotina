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

/** Bump when the guide text changes, so saved copies that were never edited get the new one. */
export const GUIDE_VERSION = 3;

/** Earlier guide texts, to tell an untouched copy (safe to replace) from one the person edited. */
export const OLD_GUIDE_BODIES: string[] = [
  [
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
    "- Escreva em Markdown. Para anexar imagens e PDF, use o botão Imagem ou PDF ou cole e arraste no texto.",
    "- Ctrl/Cmd + K abre a busca.",
    "- Ctrl + Delete (⌘ + ⌫ no Mac) apaga o item selecionado ou sob o mouse. Dá para desfazer logo em seguida.",
    "",
    "- [ ] Apagar os itens de exemplo quando terminar de explorar",
    "",
  ].join("\n"),
];

/** The guide as shipped in version 2 (kept to recognise untouched copies). */
const GUIDE_BODY_V2 = [
  "Bem-vindo ao Minha Rotina! Este guia mostra, passo a passo, tudo o que o site faz. Leva uns 5 minutos. Marque cada passo do **Experimente** quando conseguir.",
  "",
  "## 1. Início: o seu dia",
  "- O **Início** mostra só as tarefas com prazo para **hoje**. É uma tela de consulta: nada se edita ali.",
  "- Clique numa tarefa para ir direto ao quadro dela.",
  "- A data muda sozinha quando vira o dia.",
  "",
  "## 2. Listas de tarefas",
  "Cada lista (Estudos, Trabalho, Compromissos…) aparece na barra lateral e tem três jeitos de ver: **Quadro**, **Tabela** e **Calendário**.",
  "",
  "**Criar uma tarefa**",
  "1. Abra uma lista na barra lateral.",
  "2. No fim de uma coluna, clique em **Nova tarefa**, escreva o nome e tecle Enter.",
  "3. Clique no cartão para abrir o painel: ali você põe data, hora, prioridade, etiquetas, descrição e o **Alarme**.",
  "",
  "**Organizar**",
  "- Arraste os cartões entre as colunas para mudar o status (A fazer → Fazendo → Feito).",
  "- Clique no nome de uma coluna para renomeá-la.",
  "- Para **copiar** uma tarefa para outra lista, arraste o cartão até o nome da lista na barra lateral. A original fica onde está.",
  "- Clique duas vezes no título da lista (no topo ou na barra lateral) para renomeá-la.",
  "",
  "**Filtrar e buscar**",
  "- **Filtrar** mostra só um status, prioridade, etiqueta ou data (hoje, esta semana, atrasadas…). Cada filtro só pode ser aplicado uma vez; os já ativos aparecem marcados com ✓.",
  "- Para tirar um filtro, clique no X dele, ou em **Limpar filtros**.",
  "- O campo **Buscar tarefas…** procura pelo nome dentro da lista.",
  "",
  "**Revisão espaçada (Estudos)**",
  "- Quando um conteúdo vai para *Estudado*, o site agenda revisões em 1, 7 e 30 dias. No dia, o cartão volta sozinho para *Revisar*.",
  "",
  "> Experimente",
  "- [ ] Criar uma tarefa com data de hoje e ver ela aparecer no Início",
  "- [ ] Arrastar um cartão para outra coluna",
  "- [ ] Aplicar um filtro e depois limpar",
  "",
  "## 3. Pastas de listas",
  "- No título **Listas de tarefas** da barra lateral, o ícone de pasta com + cria uma pasta.",
  "- Arraste uma lista para dentro de uma pasta. Arraste uma pasta para dentro de outra para criar uma subpasta.",
  "- Para tirar algo da pasta, arraste até **Solte aqui para tirar da pasta**.",
  "- Clique duas vezes no nome da pasta para renomear. No menu **⋯** dela, **Renomear e trocar ícone** deixa escolher um desenho (aba **Ícones**) ou um emoji.",
  "- Excluir uma pasta não apaga as listas: elas só saem da pasta.",
  "",
  "## 4. Alarmes por e-mail ou WhatsApp",
  "1. Abra uma tarefa (ou um evento) que tenha data e hora.",
  "2. Na seção **Alarme**, escolha **E-mail** ou **WhatsApp**.",
  "3. Em **Quando**, escolha o aviso: na hora, 10 minutos antes, 1 dia antes…",
  "- O número do WhatsApp fica em **Configurações → Alertas**.",
  "- Os alarmes precisam de uma conta (login). Sem conta, os dados ficam só neste navegador.",
  "",
  "## 5. Calendário",
  "- Veja o **Mês** ou a **Semana** e clique num dia para criar um evento.",
  "- Eventos podem se repetir (toda semana, todo mês…), como aulas ou consultas.",
  "- As tarefas com data aparecem no calendário junto com os eventos.",
  "",
  "## 6. Anotações",
  "- **Nova nota** cria uma anotação. Escreva normalmente: a barra de cima faz negrito, títulos, listas, checklist, citação e link.",
  "- Escreva **#palavra** para criar uma tag. As tags e as pastas ficam na lateral das anotações.",
  "- **Editar** e **Ler** alternam entre escrever e ver o texto pronto. O **Modo foco** esconde o resto da tela.",
  "",
  "**Imagens e PDF**",
  "1. No modo **Editar**, clique em **Imagem ou PDF** (o ícone de clipe).",
  "2. Escolha o arquivo (até 10 MB). Também dá para **colar** ou **arrastar** o arquivo para dentro do texto.",
  "3. A imagem aparece no texto; o PDF vira um cartão que abre numa nova aba.",
  "",
  "> Experimente",
  "- [ ] Criar uma nota com uma #tag",
  "- [ ] Anexar uma foto ou um PDF",
  "",
  "## 7. Hábitos",
  "- Crie um hábito e toque em **Hoje** quando fizer. A 🔥 conta quantos dias seguidos você manteve.",
  "- As bolinhas mostram os últimos 7 dias, do mais antigo até hoje:",
  "  - **verde**: feito;",
  "  - **vermelho**: não feito, depois que você já tinha começado o hábito;",
  "  - **cinza**: antes de você começar (não conta como falha);",
  "  - **contorno**: hoje, que ainda dá tempo.",
  "- Esqueceu de marcar um dia? Toque na bolinha dele. **Histórico** mostra as últimas semanas.",
  "",
  "## 8. Áreas",
  "- O seletor no topo (Todas, Pessoal, Profissional, Estudos…) filtra tarefas e eventos de todo o site pela área.",
  "- O botão **＋** ao lado cria uma área nova, como Saúde ou Casa.",
  "",
  "## 9. Atalhos",
  "- **Ctrl/⌘ + K**: buscar em tudo.",
  "- **Ctrl + Delete** (**⌘ + ⌫** no Mac): apaga o que está aberto, selecionado ou sob o mouse. Funciona também com o painel da tarefa aberto. Aparece um aviso com **Desfazer**.",
  "- **Ctrl/⌘ + B** e **I**: negrito e itálico nas anotações.",
  "- **Esc**: fecha painéis e janelas.",
  "",
  "## 10. Mais",
  "- **Configurações**: seu nome, tema claro ou escuro, áreas, alertas, backup e conta.",
  "- **Lixeira** (com conta): o que você apagar fica lá por 30 dias.",
  "- **Instalar como app**: no Chrome ou Edge, use o ícone de instalar na barra de endereço; no iPhone, **Compartilhar → Adicionar à Tela de Início**.",
  "",
  "- [ ] Apagar os itens de exemplo quando terminar de explorar",
  "",
].join("\n");

export const GUIDE_BODY = GUIDE_BODY_V2.replace(
  "- Para **copiar** uma tarefa para outra lista, arraste o cartão até o nome da lista na barra lateral. A original fica onde está.",
  "- Para **mudar uma tarefa de lista**, arraste o cartão até o nome da outra lista na barra lateral. Se mudou de ideia, clique em **Desfazer** no aviso.",
)
  .replace(
    "- **Filtrar** mostra só um status, prioridade, etiqueta ou data (hoje, esta semana, atrasadas…). Cada filtro só pode ser aplicado uma vez; os já ativos aparecem marcados com ✓.",
    "- **Filtrar** mostra só um status, prioridade, etiqueta ou data (hoje, esta semana, atrasadas…). Cada filtro só pode ser aplicado uma vez; os já ativos aparecem marcados com ✓. De **data** vale um por vez: escolher outro troca o anterior.",
  )
  .replace(
    "> Experimente\n- [ ] Criar uma nota com uma #tag",
    [
      "**Fórmulas (LaTeX)**, como no Obsidian",
      "- Entre cifrões, a fórmula fica no meio do texto: `$E = mc^2$` vira $E = mc^2$.",
      "- Com dois cifrões, ela ganha uma linha só para ela:",
      "",
      "$$",
      "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
      "$$",
      "",
      "- O botão **Σ** da barra põe os cifrões para você. Clique numa fórmula para editar; ao sair, ela aparece desenhada.",
      "- Valores como R$ 10 continuam texto normal.",
      "",
      "> Experimente",
      "- [ ] Criar uma nota com uma #tag",
      "- [ ] Escrever a fórmula $a^2 + b^2 = c^2$",
    ].join("\n"),
  );
// Version 2 joins the old texts here, once it's defined.
OLD_GUIDE_BODIES.push(GUIDE_BODY_V2);

export const GUIDE_NOTE = (id = uid()): Note => ({
  id,
  folder: "",
  title: "Guia rápido",
  created: Date.now(),
  updated: Date.now(),
  body: GUIDE_BODY,
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
    body: "- Anote aqui o que vier à cabeça. Veja o Guia rápido para mais dicas.\n\n#exemplo\n",
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
      { id: uid(), name: "Ler 20 minutos", icon: "📖", created: today() },
      { id: uid(), name: "Exercício", icon: "🏃", created: today() },
      { id: uid(), name: "Beber 2 L de água", icon: "💧", created: today() },
    ],
    habitLog: {},
    settings: { ...DEFAULT_SETTINGS, areas: DEFAULT_AREAS.map((a) => ({ ...a })), guideVersion: GUIDE_VERSION },
  };
}
