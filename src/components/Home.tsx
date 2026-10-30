import { CalendarDays, Check, ChevronRight, CircleCheck, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area } from "@/lib/types";
import { eventsByDay, inArea } from "@/lib/events";
import { dateOf, groupOf } from "@/lib/model";
import { addDays, parseD } from "@/lib/util";
import { go, useStore } from "@/store";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { areaVar, greeting, useAreas, useToday } from "./common";
import { Progress } from "@/components/ui/progress";

interface Entry {
  key: string;
  time: string;
  title: string;
  sub?: string;
  area?: Area;
  done: boolean;
  order: number;
  onOpen?: () => void;
}

const byTime = (a: Entry, b: Entry) => (a.time || "99").localeCompare(b.time || "99") || a.order - b.order;

/** Home is a read-only view of what is due today; clicking a task opens its board. */
export function Home() {
  const ws = useStore((s) => s.ws);
  const area = useStore((s) => s.ui.area);
  const areas = useAreas();
  const T = useToday();
  const areaOf = (id?: string) => areas.find((a) => a.id === id);

  const entries: Entry[] = [];
  for (const it of Object.values(ws.items)) {
    const db = ws.dbs[it.db];
    if (!db || !inArea(it.area, area)) continue;
    const d = dateOf(db, it);
    if (!d || d.slice(0, 10) !== T) continue;
    const page = ws.pages.find((p) => p.id === it.db);
    entries.push({
      key: "t" + it.id,
      time: d.slice(11, 16),
      title: it.title || "Sem título",
      sub: page ? `${page.icon} ${page.title}` : undefined,
      area: areaOf(it.area),
      done: groupOf(db, it) === "done",
      order: it.created,
      onOpen: page ? () => go(page.id) : undefined,
    });
  }
  for (const t of Object.values(ws.todos)) {
    if (t.date !== T || !inArea(t.area, area)) continue;
    entries.push({
      key: "d" + t.id,
      time: "",
      title: t.text,
      area: areaOf(t.area),
      done: t.done,
      order: t.order,
    });
  }
  const open = entries.filter((e) => !e.done).sort(byTime);
  const done = entries.filter((e) => e.done).sort(byTime);

  const summary =
    open.length === 0
      ? done.length
        ? "Tudo feito por hoje."
        : "Nenhuma tarefa com prazo para hoje."
      : `${open.length} ${open.length === 1 ? "tarefa" : "tarefas"} com prazo hoje${done.length ? `, ${done.length} já ${done.length === 1 ? "feita" : "feitas"}` : ""}.`;
  const date = parseD(T)
    .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8 px-4 py-6 md:px-8 md:py-8 lg:max-w-6xl">
      <header className="flex flex-col gap-2">
        <p className="text-lg text-muted-foreground">{greeting(ws.settings.name)}</p>
        <h1 className="text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">{date}</h1>
        <p className="text-lg text-muted-foreground">{summary}</p>
        {/* How much of today is already done: a bar with an outlined track (visible even at 0%), the count in words, and a done state. */}
        {entries.length > 0 && <DayProgress done={done.length} total={entries.length} />}
      </header>

      {/* Wide screens: today's tasks on the left, what's coming up on the right. Phones: one column, tasks first. */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <section aria-labelledby="home-tasks" className="flex min-w-0 flex-col gap-3">
          <h2 id="home-tasks" className="sr-only">
            Tarefas de hoje
          </h2>
          {entries.length ? (
            <ol className="stagger flex flex-col gap-2.5" aria-label="Tarefas com prazo hoje">
              {[...open, ...done].map((e, i) => (
                <Row key={e.key} e={e} i={i} />
              ))}
            </ol>
          ) : (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyTitle>Dia livre</EmptyTitle>
                <EmptyDescription>Tarefas com prazo para hoje aparecem aqui. Dê uma data a elas nos quadros.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>
        <aside className="flex flex-col gap-4" aria-label="Resumo">
          <Upcoming T={T} area={area} />
          <HabitsToday T={T} />
        </aside>
      </div>
    </div>
  );
}

const UPCOMING_DAYS = 3;

/** Events from now to the next few days, read-only; a click shows that day in the calendar. */
function Upcoming({ T, area }: { T: string; area: string }) {
  const ws = useStore((s) => s.ws);
  const setUi = useStore((s) => s.setUi);
  const areas = useAreas();
  const cal = ws.pages.find((p) => p.type === "calendar");
  const now = new Date();
  const hhmm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  const byDay = eventsByDay(ws, T, addDays(T, UPCOMING_DAYS), area);
  const list = Object.keys(byDay)
    .sort()
    .flatMap((d) => byDay[d].map((e) => ({ ...e, day: d })))
    // Today's events that already ended are left out.
    .filter((e) => e.day !== T || e.allDay || (e.end || e.start) >= hhmm)
    .slice(0, 6);
  const show = (day: string) => {
    if (!cal) return;
    setUi((u) => {
      u.calendar.anchor = day;
    });
    go(cal.id);
  };
  const dayName = (d: string) =>
    d === T ? "Hoje" : d === addDays(T, 1) ? "Amanhã" : parseD(d).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return (
    <section aria-labelledby="home-upcoming" className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 id="home-upcoming" className="flex items-center gap-2 text-base font-semibold">
          <CalendarDays className="size-[18px] text-primary-strong" aria-hidden="true" />
          Próximos compromissos
        </h2>
        {cal && (
          <button
            onClick={() => show(T)}
            className="rounded-md px-1 text-sm font-medium text-primary-strong hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Ver agenda
          </button>
        )}
      </div>
      {list.length ? (
        <ul className="flex flex-col gap-1">
          {list.map((e) => (
            <li key={e.id + e.day}>
              <button
                onClick={() => show(e.day)}
                style={areaVar(areas.find((a) => a.id === e.area))}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="h-9 w-1 shrink-0 rounded-full bg-(--area,var(--primary))" aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium">{e.title || "Evento"}</span>
                  <span className="text-sm text-muted-foreground capitalize">
                    {dayName(e.day)} · {e.allDay ? "dia todo" : e.start}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum evento nos próximos {UPCOMING_DAYS} dias.</p>
      )}
    </section>
  );
}

/** How many habits are done today; a click opens Hábitos. */
function HabitsToday({ T }: { T: string }) {
  const habits = useStore((s) => s.ws.habits);
  const log = useStore((s) => s.ws.habitLog[T]);
  const page = useStore((s) => s.ws.pages.find((p) => p.type === "habits"));
  if (!habits.length || !page) return null;
  const doneIds = new Set(log ?? []);
  const done = habits.filter((h) => doneIds.has(h.id)).length;
  return (
    <button
      onClick={() => go(page.id)}
      className="lift flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 text-left shadow-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-base font-semibold">
          <Sprout className="size-[18px] text-success" aria-hidden="true" />
          Hábitos de hoje
        </span>
        <span className="text-sm font-semibold text-muted-foreground tabular-nums">
          {done}/{habits.length}
        </span>
      </span>
      <span className="flex flex-wrap gap-1.5">
        {habits.map((h) => (
          <span
            key={h.id}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm",
              doneIds.has(h.id) ? "border-success/40 bg-success/10 text-foreground" : "border-border text-muted-foreground",
            )}
          >
            {doneIds.has(h.id) && <Check className="size-3.5 text-success" aria-label="feito" />}
            {h.name}
          </span>
        ))}
      </span>
    </button>
  );
}

function DayProgress({ done, total }: { done: number; total: number }) {
  const complete = done === total;
  return (
    <div className="mt-2 flex max-w-md items-center gap-3">
      <Progress
        value={(done / total) * 100}
        aria-label={`${done} de ${total} feitas hoje`}
        className="h-2.5 flex-1 bg-transparent ring-1 ring-(--input) ring-inset [&>[data-slot=progress-indicator]]:rounded-full [&>[data-slot=progress-indicator]]:bg-success"
      />
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums",
          complete ? "text-success" : "text-muted-foreground",
        )}
      >
        {complete && <CircleCheck className="size-4" aria-hidden="true" />}
        {complete ? "Tudo feito!" : `${done}/${total}`}
      </span>
    </div>
  );
}

function Row({ e, i }: { e: Entry; i: number }) {
  const body = (
    <>
      {/* The whole page is "today", so the left column says when in the day (or that it has no set time). */}
      <span
        className={cn(
          "flex w-16 shrink-0 flex-col text-base leading-tight tabular-nums",
          e.time ? "font-semibold" : "text-sm text-muted-foreground",
          e.done && "text-muted-foreground",
        )}
      >
        {e.time || "Dia todo"}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("truncate text-base font-medium", e.done && "text-muted-foreground line-through")}>{e.title}</span>
        {e.sub && <span className="truncate text-sm text-muted-foreground">{e.sub}</span>}
      </span>
      {e.done && (
        <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
          <CircleCheck className="size-4 text-success" aria-hidden="true" />
          Feita
        </span>
      )}
      {e.onOpen && <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );
  const cls = "area-stripe flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card py-4 pr-4 pl-5 text-left";
  return (
    <li style={{ ...areaVar(e.area), "--i": Math.min(i, 12) } as React.CSSProperties} className={cn(e.done && "opacity-70")}>
      {e.onOpen ? (
        <button
          onClick={e.onOpen}
          className={cn(
            cls,
            "lift hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          )}
        >
          {body}
        </button>
      ) : (
        <div className={cn(cls, "shadow-card")}>{body}</div>
      )}
    </li>
  );
}
