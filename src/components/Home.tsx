import { useState } from "react";
import { AlertCircle, CalendarPlus, ChevronDown, ChevronUp, Plus, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area } from "@/lib/types";
import { eventsByDay, inArea } from "@/lib/events";
import { dateOf, firstOptInGroup, groupOf, statusProp } from "@/lib/model";
import { fmtDate, today } from "@/lib/util";
import { addTodo, go, openEvent, openPeek, setProp, toast, toggleTodo, useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { areaVar, greeting, useAreas } from "./common";

interface Entry {
  key: string;
  del: string;
  time: string;
  title: string;
  sub?: string;
  area?: Area;
  kind: "event" | "task" | "todo";
  done?: boolean;
  repeat?: boolean;
  onOpen: () => void;
  onToggle?: () => void;
}

/** Home: only what is happening today, in time order. */
export function Home() {
  const ws = useStore((s) => s.ws);
  const area = useStore((s) => s.ui.area);
  const areas = useAreas();
  const [showLate, setShowLate] = useState(false);
  const T = today();
  const areaOf = (id?: string) => areas.find((a) => a.id === id);

  const entries: Entry[] = [];
  for (const e of eventsByDay(ws, T, T, area)[T] ?? [])
    entries.push({
      key: "e" + e.id,
      del: "event:" + e.id,
      time: e.allDay ? "" : e.start,
      title: e.title,
      kind: "event",
      area: areaOf(e.area),
      sub: [e.allDay ? "Dia inteiro" : e.end ? `Até ${e.end}` : "", e.location].filter(Boolean).join(" · "),
      repeat: !!e.repeat && e.repeat !== "none",
      onOpen: () => openEvent(e.id),
    });
  const late: Entry[] = [];
  for (const it of Object.values(ws.items)) {
    const db = ws.dbs[it.db];
    if (!db || !inArea(it.area, area)) continue;
    const d = dateOf(db, it);
    if (!d) continue;
    const day = d.slice(0, 10),
      g = groupOf(db, it);
    if (day > T || (day < T && g === "done")) continue;
    const page = ws.pages.find((p) => p.id === it.db);
    const doneId = firstOptInGroup(db, "done"),
      sp = statusProp(db);
    const entry: Entry = {
      key: "t" + it.id,
      del: "task:" + it.id,
      time: d.slice(11, 16),
      title: it.title || "Sem título",
      kind: "task",
      area: areaOf(it.area),
      sub: (day < T ? `Atrasada desde ${fmtDate(day).toLowerCase()} · ` : "") + (page ? `${page.icon} ${page.title}` : ""),
      done: g === "done",
      onOpen: () => openPeek(it.id),
      onToggle:
        doneId && sp
          ? () => {
              const snap = it;
              if (g === "done") setProp(it.id, sp.id, sp.options![0].id);
              else {
                setProp(it.id, sp.id, doneId);
                toast(`Concluída: ${it.title || "tarefa"}`, () =>
                  useStore.getState().mut((w) => {
                    w.items[snap.id] = snap;
                  }),
                );
              }
            }
          : undefined,
    };
    (day < T ? late : entries).push(entry);
  }
  const todoPage = ws.pages.find((p) => p.type === "todo");
  for (const t of Object.values(ws.todos)) {
    if (!t.date || t.date > T || !inArea(t.area, area) || (t.date < T && t.done)) continue;
    const entry: Entry = {
      key: "d" + t.id,
      del: "todo:" + t.id,
      time: "",
      title: t.text,
      kind: "todo",
      area: areaOf(t.area),
      done: t.done,
      sub: t.date < T ? `Atrasado desde ${fmtDate(t.date).toLowerCase()}` : "Afazer",
      onOpen: () => {
        if (todoPage) go(todoPage.id);
      },
      onToggle: () => toggleTodo(t.id),
    };
    (t.date < T ? late : entries).push(entry);
  }
  // Timed things first, by hour; then the rest of the day; finished ones last.
  entries.sort((a, b) => Number(!!a.done) - Number(!!b.done) || (a.time || "99").localeCompare(b.time || "99"));
  const open = entries.filter((e) => !e.done).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{greeting(ws.settings.name)}</h1>
          <p className="text-muted-foreground">
            {new Date()
              .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
              .replace(/^./, (c) => c.toUpperCase())}
            {" · "}
            {open === 0
              ? entries.length
                ? "tudo feito por hoje"
                : "nada marcado para hoje"
              : `${open} ${open === 1 ? "compromisso" : "compromissos"} para hoje`}
          </p>
        </div>
        <Button variant="outline" onClick={() => openEvent(null, T)}>
          <CalendarPlus data-icon="inline-start" />
          Novo evento
        </Button>
      </header>

      {late.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5">
          <button
            className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-expanded={showLate}
            onClick={() => setShowLate((v) => !v)}
          >
            <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
            <span className="flex-1">
              {late.length} {late.length === 1 ? "item atrasado" : "itens atrasados"}
            </span>
            <span className="text-muted-foreground">{showLate ? "Esconder" : "Ver"}</span>
            {showLate ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </button>
          {showLate && (
            <ol className="flex flex-col gap-1.5 px-2 pb-2">
              {late.map((e) => (
                <Row key={e.key} e={e} />
              ))}
            </ol>
          )}
        </div>
      )}

      {entries.length ? (
        <ol className="flex flex-col gap-1.5" aria-label="Hoje">
          {entries.map((e) => (
            <Row key={e.key} e={e} />
          ))}
        </ol>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Dia livre</EmptyTitle>
            <EmptyDescription>Nada marcado para hoje. Adicione um evento ou um afazer.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <QuickTodo />
    </div>
  );
}

function Row({ e }: { e: Entry }) {
  return (
    <li
      data-del={e.del}
      style={areaVar(e.area)}
      className={cn(
        "area-stripe flex items-center gap-3 rounded-xl border bg-card py-2.5 pr-3 pl-5",
        e.kind === "event" && "area-soft border-transparent",
      )}
    >
      <span className={cn("w-11 shrink-0 text-sm tabular-nums", e.time ? "font-semibold" : "text-muted-foreground")}>
        {e.time || (e.kind === "event" ? "Dia" : "—")}
      </span>
      {e.onToggle && (
        <Checkbox
          checked={!!e.done}
          onCheckedChange={e.onToggle}
          aria-label={e.done ? `Desmarcar ${e.title}` : `Concluir ${e.title}`}
        />
      )}
      <button
        className="flex min-w-0 flex-1 flex-col rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={e.onOpen}
      >
        <span className={cn("flex min-w-0 items-center gap-1.5 font-medium", e.done && "text-muted-foreground line-through")}>
          <span className="truncate">{e.title}</span>
          {e.repeat && <Repeat className="size-3.5 shrink-0 text-muted-foreground" aria-label="Repete" />}
        </span>
        {e.sub && <span className="truncate text-xs text-muted-foreground">{e.sub}</span>}
      </button>
    </li>
  );
}

function QuickTodo() {
  const [v, setV] = useState("");
  return (
    <form
      className="flex gap-2"
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
        placeholder="Adicionar um afazer para hoje…"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <Button type="submit" variant="secondary" disabled={!v.trim()}>
        <Plus data-icon="inline-start" />
        Adicionar
      </Button>
    </form>
  );
}
