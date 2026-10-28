import { useState } from "react";
import { AlertCircle, ArrowDownToLine, CalendarPlus, ChevronDown, ChevronUp, Plus, Repeat, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area } from "@/lib/types";
import { eventsByDay, inArea } from "@/lib/events";
import { dateOf, firstOptInGroup, groupOf, statusProp } from "@/lib/model";
import { fmtDate, today } from "@/lib/util";
import { addTodo, deleteTodo, openEvent, openPeek, setProp, toast, toggleTodo, updateTodo, useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  order?: number;
  onOpen?: () => void;
  onToggle?: () => void;
  onRename?: (text: string) => void;
  onRemove?: () => void;
  onToday?: () => void;
}

const byTime = (a: Entry, b: Entry) => (a.time || "99").localeCompare(b.time || "99") || (a.order ?? 0) - (b.order ?? 0);

/** Home: today's tasks first (with a field to add one), then today's agenda; the rest stays folded. */
export function Home() {
  const ws = useStore((s) => s.ws);
  const area = useStore((s) => s.ui.area);
  const areas = useAreas();
  const [showLate, setShowLate] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const T = today();
  const areaOf = (id?: string) => areas.find((a) => a.id === id);

  const events: Entry[] = (eventsByDay(ws, T, T, area)[T] ?? []).map((e) => ({
    key: "e" + e.id,
    del: "event:" + e.id,
    time: e.allDay ? "" : e.start,
    title: e.title,
    kind: "event",
    area: areaOf(e.area),
    sub: [e.allDay ? "Dia inteiro" : e.end ? `Até ${e.end}` : "", e.location].filter(Boolean).join(" · "),
    repeat: !!e.repeat && e.repeat !== "none",
    onOpen: () => openEvent(e.id),
  }));

  const tasks: Entry[] = [];
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
    const time = d.slice(11, 16);
    const entry: Entry = {
      key: "t" + it.id,
      del: "task:" + it.id,
      time,
      title: it.title || "Sem título",
      kind: "task",
      area: areaOf(it.area),
      sub: (day < T ? `Desde ${fmtDate(day).toLowerCase()} · ` : "") + (page ? `${page.icon} ${page.title}` : ""),
      done: g === "done",
      onOpen: () => openPeek(it.id),
      onToday: () => setProp(it.id, "date", time ? `${T}T${time}` : T),
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
    (day < T ? late : tasks).push(entry);
  }
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
      order: t.order,
      sub: t.date < T ? `Desde ${fmtDate(t.date).toLowerCase()}` : undefined,
      onToggle: () => toggleTodo(t.id),
      onRename: (text) => (text ? updateTodo(t.id, { text }) : deleteTodo(t.id)),
      onRemove: () => deleteTodo(t.id),
      onToday: () => updateTodo(t.id, { date: T }),
    };
    (t.date < T ? late : tasks).push(entry);
  }
  const open = tasks.filter((e) => !e.done).sort(byTime);
  const done = tasks.filter((e) => e.done).sort(byTime);
  events.sort(byTime);

  const summary =
    open.length === 0
      ? done.length
        ? "tudo feito por hoje"
        : "nada marcado para hoje"
      : `${open.length} ${open.length === 1 ? "tarefa" : "tarefas"} para hoje`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{greeting(ws.settings.name)}</h1>
        <p className="text-muted-foreground">
          {new Date()
            .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
            .replace(/^./, (c) => c.toUpperCase())}
          {" · "}
          {summary}
        </p>
      </header>

      <section aria-labelledby="hoje-tarefas" className="flex flex-col gap-3">
        <h2 id="hoje-tarefas" className="sr-only">
          Tarefas de hoje
        </h2>
        <AddToday />
        {open.length ? (
          <ol className="flex flex-col gap-1.5" aria-label="Tarefas de hoje">
            {open.map((e) => (
              <Row key={e.key} e={e} />
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {done.length
              ? "Tudo feito por hoje. Se lembrar de mais alguma coisa, escreva acima."
              : "Nada para hoje ainda. Escreva acima o que você quer fazer."}
          </p>
        )}
        {done.length > 0 && (
          <Fold open={showDone} onToggle={() => setShowDone((v) => !v)} label={`Concluídas (${done.length})`}>
            <ol className="flex flex-col gap-1.5" aria-label="Concluídas hoje">
              {done.map((e) => (
                <Row key={e.key} e={e} />
              ))}
            </ol>
          </Fold>
        )}
      </section>

      <section aria-labelledby="hoje-agenda" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 id="hoje-agenda" className="mr-auto text-sm font-semibold text-muted-foreground">
            Agenda de hoje
          </h2>
          <Button variant="ghost" size="sm" onClick={() => openEvent(null, T)}>
            <CalendarPlus data-icon="inline-start" />
            Novo evento
          </Button>
        </div>
        {events.length ? (
          <ol className="flex flex-col gap-1.5" aria-label="Agenda de hoje">
            {events.map((e) => (
              <Row key={e.key} e={e} />
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum evento hoje.</p>
        )}
      </section>

      {late.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5">
          <button
            className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-expanded={showLate}
            onClick={() => setShowLate((v) => !v)}
          >
            <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
            <span className="flex-1">
              {late.length} {late.length === 1 ? "tarefa atrasada" : "tarefas atrasadas"}
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
              {late.sort(byTime).map((e) => (
                <Row key={e.key} e={e} late />
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function Fold({
  open,
  onToggle,
  label,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <button
        className="flex items-center gap-1 self-start rounded-md px-1 py-0.5 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-expanded={open}
        onClick={onToggle}
      >
        {open ? <ChevronUp className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
        {label}
      </button>
      {open && children}
    </div>
  );
}

function Row({ e, late }: { e: Entry; late?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(e.title);
  const save = () => {
    setEditing(false);
    if (text.trim() !== e.title) e.onRename?.(text.trim());
  };
  return (
    <li
      data-del={e.del}
      style={areaVar(e.area)}
      className={cn(
        "group area-stripe flex items-center gap-3 rounded-xl border bg-card py-2.5 pr-2 pl-5",
        e.kind === "event" && "area-soft border-transparent",
      )}
    >
      {(e.time || e.kind === "event") && (
        <span className={cn("w-11 shrink-0 text-sm tabular-nums", e.time ? "font-semibold" : "text-muted-foreground")}>
          {e.time || "Dia"}
        </span>
      )}
      {e.onToggle && (
        <Checkbox
          checked={!!e.done}
          onCheckedChange={e.onToggle}
          aria-label={e.done ? `Desmarcar ${e.title}` : `Concluir ${e.title}`}
        />
      )}
      {editing ? (
        <Input
          autoFocus
          aria-label="Nome da tarefa"
          className="h-8 flex-1"
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          onBlur={save}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") ev.currentTarget.blur();
            if (ev.key === "Escape") {
              setText(e.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          className="flex min-w-0 flex-1 flex-col rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          title={e.onRename ? "Clique para editar" : undefined}
          onClick={() => {
            if (e.onRename) {
              setText(e.title);
              setEditing(true);
            } else e.onOpen?.();
          }}
        >
          <span className={cn("flex min-w-0 items-center gap-1.5 font-medium", e.done && "text-muted-foreground line-through")}>
            <span className="truncate">{e.title}</span>
            {e.repeat && <Repeat className="size-3.5 shrink-0 text-muted-foreground" aria-label="Repete" />}
          </span>
          {e.sub && <span className="truncate text-xs text-muted-foreground">{e.sub}</span>}
        </button>
      )}
      {late && e.onToday && (
        <Button variant="outline" size="sm" onClick={e.onToday}>
          <ArrowDownToLine data-icon="inline-start" />
          Mover para hoje
        </Button>
      )}
      {e.onRemove && !editing && !late && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Excluir ${e.title}`}
          className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
          onClick={e.onRemove}
        >
          <X />
        </Button>
      )}
    </li>
  );
}

function AddToday() {
  const [v, setV] = useState("");
  // Desktop only: on phones, focusing would pop the keyboard over the list.
  const [autoFocus] = useState(() => typeof matchMedia !== "undefined" && matchMedia("(pointer: fine)").matches);
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (addTodo(v, { date: today() })) setV("");
      }}
    >
      <Input
        autoFocus={autoFocus}
        autoComplete="off"
        aria-label="Nova tarefa para hoje"
        placeholder="O que você vai fazer hoje?"
        className="h-12 rounded-xl px-4 text-base md:text-base"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <Button type="submit" size="lg" className="h-12 rounded-xl" disabled={!v.trim()}>
        <Plus data-icon="inline-start" />
        Adicionar
      </Button>
    </form>
  );
}
