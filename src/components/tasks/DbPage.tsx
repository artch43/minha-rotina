import { useRef, useState } from "react";
import { CalendarDays, Check, Columns3, Filter, Plus, Search, Settings2, Table2, X } from "lucide-react";
import type { Filter as F, Page, View } from "@/lib/types";
import { applyFilters, defaultsFromFilters, filterLabel } from "@/lib/model";
import { celebrate, newItem, openPeek, renamePage, useStore } from "@/store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OptionBadge } from "../common";
import { Board } from "./Board";
import { TaskTable } from "./TaskTable";
import { TaskCalendar } from "./TaskCalendar";

const ICON = { board: Columns3, table: Table2, calendar: CalendarDays } as const;
const DATE_FILTERS: [string, string][] = [
  ["today", "Hoje"],
  ["week", "Próximos 7 dias"],
  ["overdue", "Atrasadas"],
  ["empty", "Sem data"],
];

export function DbPage({ page }: { page: Page }) {
  const ws = useStore((s) => s.ws);
  const viewId = useStore((s) => s.ui.viewByDb[page.id]);
  const search = useStore((s) => s.ui.search[page.id]) ?? "";
  const area = useStore((s) => s.ui.area);
  const { setUi, mut } = useStore.getState();
  const db = ws.dbs[page.id];
  if (!db) return null;
  const view = db.views.find((v) => v.id === viewId) ?? db.views[0];
  const list = applyFilters(ws, page.id, view, search, area);
  const hasAny = Object.values(ws.items).some((i) => i.db === page.id);
  const mutView = (fn: (v: View) => void) => mut((w) => fn(w.dbs[page.id].views.find((x) => x.id === view.id)!));
  const create = (props = {}) => openPeek(newItem(page.id, { ...defaultsFromFilters(db, view), ...props }), true);

  return (
    <div className="flex flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center gap-2 sm:gap-3">
        <PageTitle page={page} />
        <Button
          variant="outline"
          aria-label="Editar status"
          title="Editar status"
          className="max-sm:size-10 max-sm:px-0"
          onClick={() =>
            setUi((u) => {
              u.statusDialog = page.id;
            })
          }
        >
          <Settings2 data-icon="inline-start" className="max-sm:m-0" />
          <span className="max-sm:hidden">Editar status</span>
        </Button>
        <Button onClick={() => create()} aria-label="Nova tarefa" className="max-sm:size-10 max-sm:px-0">
          <Plus data-icon="inline-start" className="max-sm:m-0" />
          <span className="max-sm:hidden">Nova tarefa</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={view.id}
          onValueChange={(v) =>
            setUi((u) => {
              u.viewByDb[page.id] = v;
            })
          }
        >
          <TabsList>
            {db.views.map((v) => {
              const Icon = ICON[v.type];
              return (
                <TabsTrigger key={v.id} value={v.id}>
                  <Icon />
                  {v.name}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 max-sm:w-full sm:ml-auto">
          <InputGroup className="w-48 max-sm:flex-1">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Buscar tarefas…"
              aria-label="Buscar nesta lista"
              value={search}
              onChange={(e) => {
                const v = e.target.value;
                setUi((u) => {
                  u.search[page.id] = v;
                });
              }}
            />
          </InputGroup>
          <FilterButton
            dbId={page.id}
            view={view}
            onAdd={(f) =>
              mutView((v) => {
                if (v.filters.some((g) => sameFilter(g, f))) return;
                // Only one date filter at a time: a new one replaces the old.
                if (f.prop === "date") v.filters = v.filters.filter((g) => g.prop !== "date");
                v.filters.push(f);
              })
            }
          />
        </div>
      </div>

      {view.filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {view.filters.map((f, k) => (
            <Badge key={k} variant="secondary" className="gap-1 pr-1">
              {filterLabel(db, f)}
              <button
                aria-label="Remover filtro"
                className="rounded-full p-0.5 hover:bg-background"
                onClick={() =>
                  mutView((v) => {
                    v.filters.splice(k, 1);
                  })
                }
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="link"
            size="sm"
            onClick={() =>
              mutView((v) => {
                v.filters = [];
              })
            }
          >
            Limpar filtros
          </Button>
        </div>
      )}

      {view.type === "board" && <Board page={page} db={db} view={view} list={list} />}
      {view.type === "table" && <TaskTable db={db} list={list} hasAny={hasAny} onCreate={() => create()} />}
      {view.type === "calendar" && <TaskCalendar dbId={page.id} db={db} list={list} onCreate={(date) => create({ date })} />}
    </div>
  );
}

const sameFilter = (a: F, b: F) => a.prop === b.prop && a.op === b.op && a.val === b.val;

function FilterButton({ dbId, view, onAdd }: { dbId: string; view: View; onAdd: (f: F) => void }) {
  const db = useStore((s) => s.ws.dbs[dbId]);
  const [open, setOpen] = useState(false);
  const add = (f: F) => {
    onAdd(f);
    setOpen(false);
  };
  // A filter already in use is shown checked and can't be added again.
  const used = (f: F) => view.filters.some((g) => sameFilter(g, f));
  const pick = (f: F, children: React.ReactNode) => (
    <button
      key={f.val}
      disabled={used(f)}
      aria-pressed={used(f)}
      title={used(f) ? "Filtro já aplicado" : undefined}
      onClick={() => add(f)}
      className="relative rounded-full disabled:cursor-default disabled:opacity-60"
    >
      {children}
      {used(f) && (
        <Check className="absolute -top-1 -right-1 size-3.5 rounded-full bg-primary p-0.5 text-primary-foreground" aria-hidden="true" />
      )}
    </button>
  );
  const status = db.props.find((p) => p.id === "status")!;
  const prio = db.props.find((p) => p.id === "prio");
  const tags = db.props.find((p) => p.id === "tags");
  const section = (title: string, children: React.ReactNode) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={view.filters.length ? "secondary" : "outline"}>
          <Filter data-icon="inline-start" />
          Filtrar{view.filters.length ? ` (${view.filters.length})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-4">
        {section(
          "Status",
          status.options!.map((o) => (
            pick({ prop: "status", op: "is", val: o.id }, <OptionBadge opt={o} dot />)
          )),
        )}
        {prio?.options?.length
          ? section(
              "Prioridade",
              prio.options.map((o) => (
                pick({ prop: "prio", op: "is", val: o.id }, <OptionBadge opt={o} />)
              )),
            )
          : null}
        {tags?.options?.length
          ? section(
              "Etiqueta",
              tags.options.map((o) => (
                pick({ prop: "tags", op: "is", val: o.id }, <OptionBadge opt={o} />)
              )),
            )
          : null}
        <Separator />
        {section(
          "Data (uma por vez)",
          DATE_FILTERS.map(([k, n]) => (
            <Button
              key={k}
              variant={used({ prop: "date", op: "is", val: k }) ? "secondary" : "outline"}
              size="sm"
              disabled={used({ prop: "date", op: "is", val: k })}
              aria-pressed={used({ prop: "date", op: "is", val: k })}
              onClick={() => add({ prop: "date", op: "is", val: k })}
            >
              {used({ prop: "date", op: "is", val: k }) && <Check data-icon="inline-start" />}
              {n}
            </Button>
          )),
        )}
      </PopoverContent>
    </Popover>
  );
}

/** The list's name; double-click to rename it in place. */
function PageTitle({ page }: { page: Page }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(page.title);
  // Esc cancels for good: the blur that may follow when the field goes away must not save.
  const decided = useRef(false);
  const done = (save: boolean) => {
    if (decided.current) return;
    decided.current = true;
    setEditing(false);
    if (save && v.trim() && v.trim() !== page.title) {
      renamePage(page.id, v);
      celebrate("Lista renomeada", `Agora se chama “${v.trim()}”`, page.icon || "✏️");
    }
  };
  return (
    <h1 className="mr-auto flex min-w-0 items-center gap-2 text-3xl font-extrabold tracking-tight md:text-4xl">
      <span aria-hidden="true">{page.icon}</span>
      {editing ? (
        <input
          autoFocus
          aria-label="Nome da lista"
          value={v}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => done(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") done(true);
            if (e.key === "Escape") done(false);
          }}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <span
          className="cursor-text truncate rounded-lg px-1 hover:bg-muted/60"
          title="Clique duas vezes para renomear"
          onDoubleClick={() => {
            setV(page.title);
            decided.current = false;
            setEditing(true);
          }}
        >
          {page.title || "Sem título"}
        </span>
      )}
    </h1>
  );
}
