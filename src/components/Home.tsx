import { CalendarDays, Check, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area, Database, Group, Item, Page } from "@/lib/types";
import { eventsByDay, inArea } from "@/lib/events";
import { dateOf, firstOptInGroup, groupOf, statusProp, streakOf } from "@/lib/model";
import { addDays, fmtDate, parseD, today } from "@/lib/util";
import { addTodo, go, openEvent, openPeek, setProp, toast, toggleHabit, useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { areaVar, greeting, useAreas } from "./common";
import { TodoRow } from "./TodoPage";
import { useState } from "react";

interface Row {
  it: Item;
  db: Database;
  g: Group | null;
  page?: Page;
}

export function Home() {
  const ws = useStore((s) => s.ws);
  const area = useStore((s) => s.ui.area);
  const areas = useAreas();
  const T = today();
  const areaOf = (id?: string) => areas.find((a) => a.id === id);

  const rows: Row[] = Object.values(ws.items)
    .filter((it) => ws.dbs[it.db] && inArea(it.area, area))
    .map((it) => ({ it, db: ws.dbs[it.db], g: groupOf(ws.dbs[it.db], it), page: ws.pages.find((p) => p.id === it.db) }));
  const dueToday = rows.filter((x) => dateOf(x.db, x.it).slice(0, 10) === T && x.g !== "done");
  const late = rows.filter((x) => {
    const d = dateOf(x.db, x.it);
    return d && d.slice(0, 10) < T && x.g !== "done";
  });
  const reviews = rows.filter((x) => x.g === "review");
  const doing = rows.filter((x) => x.g === "doing");
  const eventsToday = eventsByDay(ws, T, T, area)[T] ?? [];
  const todosToday = Object.values(ws.todos).filter((t) => inArea(t.area, area) && !t.done && t.date && t.date <= T);
  const upcoming = Object.entries(eventsByDay(ws, addDays(T, 1), addDays(T, 7), area))
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, evs]) => evs)
    .slice(0, 5);
  const todayCount = eventsToday.length + dueToday.length + todosToday.length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{greeting(ws.settings.name)}</h1>
        <p className="text-muted-foreground">
          {new Date()
            .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
            .replace(/^./, (c) => c.toUpperCase())}
          {" · "}
          {todayCount === 0 ? "nada marcado para hoje" : `${todayCount} ${todayCount === 1 ? "coisa" : "coisas"} para hoje`}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Hoje</CardTitle>
              <CardDescription>Eventos, tarefas e afazeres do dia.</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => openEvent(null, T)}>
                  <Plus data-icon="inline-start" />
                  Evento
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {eventsToday.map((e) => (
                <button
                  key={e.id}
                  style={areaVar(areaOf(e.area))}
                  onClick={() => openEvent(e.id)}
                  className="area-stripe area-soft flex items-center gap-3 rounded-lg py-2 pr-3 pl-4 text-left text-sm hover:brightness-95"
                >
                  <span className="w-12 shrink-0 font-semibold tabular-nums">{e.allDay ? "Dia" : e.start}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
                  {e.location && <span className="hidden truncate text-xs text-muted-foreground sm:inline">{e.location}</span>}
                </button>
              ))}
              {dueToday.map((x) => (
                <TaskRow key={x.it.id} x={x} area={areaOf(x.it.area)} extra={dateOf(x.db, x.it).slice(11, 16)} />
              ))}
              <ul className="flex flex-col">
                {todosToday.map((t) => (
                  <TodoRow key={t.id} t={t} compact />
                ))}
              </ul>
              {todayCount === 0 && (
                <p className="py-2 text-sm text-muted-foreground">
                  Nada marcado para hoje. Aproveite para adiantar algo da lista abaixo.
                </p>
              )}
              <QuickTodo />
            </CardContent>
          </Card>

          {late.length > 0 && (
            <Section
              title="Atrasadas"
              description="Remarque ou conclua para limpar a lista."
              rows={late}
              areaOf={areaOf}
              extra={(x) => <span className="text-xs text-destructive tabular-nums">{fmtDate(dateOf(x.db, x.it))}</span>}
            />
          )}
          <Section
            title="Revisões pendentes"
            description="Revisar no dia certo ajuda a fixar o conteúdo."
            icon={<RotateCcw className="size-4" />}
            rows={reviews}
            areaOf={areaOf}
            empty="Nenhuma revisão para fazer agora."
          />
          <Section title="Em andamento" rows={doing} areaOf={areaOf} empty="Nada em andamento. Escolha algo para começar." />
        </div>

        <div className="flex flex-col gap-6">
          <HabitsCard />
          <Card>
            <CardHeader>
              <CardTitle>Próximos eventos</CardTitle>
              <CardAction>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const c = ws.pages.find((p) => p.type === "calendar");
                    if (c) go(c.id);
                  }}
                >
                  <CalendarDays data-icon="inline-start" />
                  Calendário
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {upcoming.length ? (
                upcoming.map((e) => (
                  <button
                    key={e.id}
                    style={areaVar(areaOf(e.area))}
                    onClick={() => openEvent(e.id)}
                    className="area-stripe flex items-center gap-3 rounded-lg py-1.5 pr-2 pl-4 text-left text-sm hover:bg-muted"
                  >
                    <span className="w-20 shrink-0 text-xs text-muted-foreground capitalize">
                      {parseD(e.date).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" }).replace(".", "")}
                      {e.allDay ? "" : ` · ${e.start}`}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum evento nos próximos 7 dias.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickTodo() {
  const [v, setV] = useState("");
  return (
    <form
      className="mt-1 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (addTodo(v, { date: today() })) {
          setV("");
          toast("Afazer adicionado para hoje");
        }
      }}
    >
      <Input
        autoComplete="off"
        aria-label="Novo afazer para hoje"
        placeholder="Adicionar afazer para hoje…"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <Button type="submit" variant="secondary" disabled={!v.trim()}>
        Adicionar
      </Button>
    </form>
  );
}

function TaskRow({ x, area, extra }: { x: Row; area?: Area; extra?: React.ReactNode }) {
  const done = firstOptInGroup(x.db, "done");
  const sp = statusProp(x.db);
  return (
    <div
      style={areaVar(area)}
      className="area-stripe group flex items-center gap-3 rounded-lg py-1.5 pr-2 pl-4 hover:bg-muted/60"
    >
      {done && sp ? (
        <Checkbox
          aria-label={`Concluir ${x.it.title || "tarefa"}`}
          checked={false}
          onCheckedChange={() => {
            const snap = x.it;
            setProp(x.it.id, sp.id, done);
            toast(`Concluída: ${x.it.title || "tarefa"}`, () =>
              useStore.getState().mut((w) => {
                w.items[snap.id] = snap;
              }),
            );
          }}
        />
      ) : (
        <Check className="size-4 text-muted-foreground" />
      )}
      <button className="min-w-0 flex-1 truncate text-left text-sm" onClick={() => openPeek(x.it.id)}>
        {x.it.title || "Sem título"}
      </button>
      {extra && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{extra}</span>}
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
        {x.page ? `${x.page.icon} ${x.page.title}` : ""}
      </span>
    </div>
  );
}

function Section({
  title,
  description,
  icon,
  rows,
  areaOf,
  empty,
  extra,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  rows: Row[];
  areaOf: (id?: string) => Area | undefined;
  empty?: string;
  extra?: (x: Row) => React.ReactNode;
}) {
  if (!rows.length && !empty) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title} <span className="text-sm font-normal text-muted-foreground tabular-nums">{rows.length}</span>
        </CardTitle>
        {description && rows.length > 0 && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
        {rows.length ? (
          rows.slice(0, 10).map((x) => <TaskRow key={x.it.id} x={x} area={areaOf(x.it.area)} extra={extra?.(x)} />)
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function HabitsCard() {
  const habits = useStore((s) => s.ws.habits);
  const log = useStore((s) => s.ws.habitLog);
  const pages = useStore((s) => s.ws.pages);
  const T = today();
  const doneN = habits.filter((h) => (log[T] || []).includes(h.id)).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Hábitos de hoje{" "}
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            {doneN}/{habits.length}
          </span>
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const h = pages.find((p) => p.type === "habits");
              if (h) go(h.id);
            }}
          >
            Ver todos
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
        {habits.length ? (
          habits.map((h) => {
            const on = (log[T] || []).includes(h.id),
              streak = streakOf(log, h.id);
            return (
              <label key={h.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60">
                <Checkbox checked={on} onCheckedChange={() => toggleHabit(h.id, T)} />
                <span className={cn("flex-1 text-sm", on && "text-muted-foreground")}>
                  {h.icon} {h.name}
                </span>
                {streak > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums" title="Dias seguidos">
                    🔥 {streak}
                  </span>
                )}
              </label>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">Crie hábitos na página Hábitos.</p>
        )}
      </CardContent>
    </Card>
  );
}
