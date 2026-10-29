import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area } from "@/lib/types";
import { inArea } from "@/lib/events";
import { dateOf, groupOf } from "@/lib/model";
import { parseD } from "@/lib/util";
import { go, useStore } from "@/store";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { areaVar, greeting, useAreas, useToday } from "./common";

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
    <div className="flex w-full max-w-3xl flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-2">
        <p className="text-lg text-muted-foreground">{greeting(ws.settings.name)}</p>
        <h1 className="text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">{date}</h1>
        <p className="text-lg text-muted-foreground">{summary}</p>
      </header>

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
    </div>
  );
}

function Row({ e, i }: { e: Entry; i: number }) {
  const body = (
    <>
      <span
        className={cn(
          "w-14 shrink-0 text-base tabular-nums",
          e.time ? "font-semibold" : "text-muted-foreground",
          e.done && "text-muted-foreground",
        )}
      >
        {e.time || "Hoje"}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("truncate text-base font-medium", e.done && "text-muted-foreground line-through")}>{e.title}</span>
        {e.sub && <span className="truncate text-sm text-muted-foreground">{e.sub}</span>}
      </span>
      {e.done && <span className="shrink-0 text-sm text-muted-foreground">Feita</span>}
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
